# Manual Técnico - Sistema de Nómina

## 1. Configuración del Entorno de Desarrollo

### 1.1 Requisitos Previos

```bash
# Node.js 20+
node --version  # v20.x.x

# npm o pnpm
npm --version   # 10.x.x

# Docker (opcional pero recomendado)
docker --version

# PostgreSQL (si no usa Docker)
psql --version  # 15.x
```

### 1.2 Clonar y Configurar

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/nomina.git
cd nomina

# Configurar backend
cd backend
cp .env.example .env
npm install

# Configurar frontend
cd ../frontend
cp .env.example .env
npm install
```

### 1.3 Iniciar con Docker

```bash
# Desarrollo
docker compose -f docker-compose.dev.yml up --build

# La primera vez, ejecutar migraciones
docker exec nomina-backend-dev npx prisma migrate dev
```

### 1.4 Iniciar sin Docker

```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

## 2. Estructura del Backend (NestJS)

### 2.1 Módulos Principales

```
src/modules/
├── auth/           # Autenticación JWT
├── employees/      # CRUD empleados
├── payroll/        # Cálculo de nómina
├── cfdi/           # Generación CFDI
├── attendance/     # Control asistencia
├── vacations/      # Gestión vacaciones
├── benefits/       # Prestaciones
├── incidents/      # Incidencias
├── reports/        # Reportes Excel
├── catalogs/       # Catálogos SAT/empresas
├── devices/        # Dispositivos biométricos
├── system-config/  # Configuración global
└── accounting-config/ # Config contable
```

### 2.2 Anatomía de un Módulo

```typescript
// employees/employees.module.ts
@Module({
  imports: [PrismaModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
```

```typescript
// employees/employees.controller.ts
@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Roles('admin', 'rh')
  findAll(@Query() query: FindEmployeesDto) {
    return this.employeesService.findAll(query);
  }

  @Post()
  @Roles('admin', 'rh')
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }
}
```

```typescript
// employees/employees.service.ts
@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindEmployeesDto) {
    return this.prisma.employee.findMany({
      where: { companyId: query.companyId },
      include: { department: true, jobPosition: true },
    });
  }

  async create(dto: CreateEmployeeDto) {
    return this.prisma.employee.create({ data: dto });
  }
}
```

### 2.3 Guards de Autenticación

```typescript
// auth/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    if (err || !user) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    return user;
  }
}

// auth/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

### 2.4 Decoradores Personalizados

```typescript
// decorators/roles.decorator.ts
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user?.[data] : request.user;
  },
);
```

---

## 3. Prisma ORM

### 3.1 Schema Principal

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Employee {
  id              String   @id @default(uuid())
  employeeNumber  String   @unique @map("employee_number")
  firstName       String   @map("first_name")
  lastName        String   @map("last_name")
  email           String?  @unique
  curp            String   @unique
  rfc             String   @unique
  baseSalary      Decimal  @map("base_salary") @db.Decimal(12, 2)

  // Relaciones
  company         Company  @relation(fields: [companyId], references: [id])
  companyId       String   @map("company_id")
  department      Department @relation(fields: [departmentId], references: [id])
  departmentId    String   @map("department_id")

  payrolls        Payroll[]

  @@map("employees")
}
```

### 3.2 Comandos de Prisma

```bash
# Generar cliente
npx prisma generate

# Crear migración
npx prisma migrate dev --name nombre_migracion

# Aplicar migraciones (producción)
npx prisma migrate deploy

# Reset base de datos (¡DESTRUCTIVO!)
npx prisma migrate reset --force

# Abrir Prisma Studio
npx prisma studio

# Formatear schema
npx prisma format
```

### 3.3 Patrones de Uso

```typescript
// Transacciones
const result = await this.prisma.$transaction([
  this.prisma.employee.update({ where: { id }, data: { status: 'INACTIVE' } }),
  this.prisma.auditLog.create({ data: { action: 'DEACTIVATE', entityId: id } }),
]);

// Upsert
await this.prisma.config.upsert({
  where: { key: 'SETTING_KEY' },
  update: { value: newValue },
  create: { key: 'SETTING_KEY', value: newValue },
});

// Agregaciones
const stats = await this.prisma.payroll.aggregate({
  where: { periodId },
  _sum: { netPay: true },
  _avg: { netPay: true },
  _count: true,
});
```

---

## 4. Estructura del Frontend (React)

### 4.1 Estructura de Carpetas

```
src/
├── components/        # Componentes reutilizables
│   ├── Layout.tsx
│   └── SearchableSelect.tsx
├── contexts/          # Context API
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── SystemConfigContext.tsx
├── pages/             # Páginas/Vistas
│   ├── DashboardPage.tsx
│   ├── EmployeesPage.tsx
│   └── ...
├── services/
│   └── api.ts         # Cliente Axios
├── hooks/             # Custom hooks
├── utils/             # Funciones utilitarias
├── App.tsx
└── main.tsx
```

### 4.2 Context Pattern

```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### 4.3 React Query Pattern

```typescript
// pages/EmployeesPage.tsx
function EmployeesPage() {
  const [filters, setFilters] = useState({ page: 1, search: '' });

  // Query para listar
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', filters],
    queryFn: () => employeesApi.getAll(filters),
  });

  // Mutation para crear
  const createMutation = useMutation({
    mutationFn: (data: CreateEmployeeDto) => employeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Empleado creado');
    },
    onError: (error) => {
      toast.error('Error al crear empleado');
    },
  });

  return (
    <div>
      {isLoading && <Spinner />}
      {error && <ErrorMessage error={error} />}
      {data && <EmployeeTable data={data} />}
    </div>
  );
}
```

### 4.4 Cliente API

```typescript
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Interceptor para token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const employeesApi = {
  getAll: (params?: any) => api.get('/employees', { params }),
  getById: (id: string) => api.get(`/employees/${id}`),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.patch(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
};
```

---

## 5. Cálculos de Nómina

### 5.1 Fórmulas Principales

#### ISR (Impuesto Sobre la Renta)
```typescript
function calcularISR(baseGravable: number, tablaISR: TablaISR[]): number {
  const rango = tablaISR.find(
    r => baseGravable >= r.limiteInferior && baseGravable <= r.limiteSuperior
  );

  if (!rango) return 0;

  const excedente = baseGravable - rango.limiteInferior;
  const impuestoMarginal = excedente * (rango.porcentaje / 100);
  const isrBruto = impuestoMarginal + rango.cuotaFija;

  return isrBruto;
}
```

#### Subsidio al Empleo
```typescript
function calcularSubsidio(baseGravable: number, tablaSubsidio: TablaSubsidio[]): number {
  const rango = tablaSubsidio.find(
    r => baseGravable >= r.limiteInferior && baseGravable <= r.limiteSuperior
  );

  return rango?.subsidio || 0;
}
```

#### Cuotas IMSS
```typescript
function calcularCuotasIMSS(salarioDiario: number, diasTrabajados: number): CuotasIMSS {
  const sbc = calcularSBC(salarioDiario); // Salario Base de Cotización
  const uma = 108.57; // Valor UMA 2024

  return {
    enfermedadMaternidad: {
      patronal: sbc * diasTrabajados * 0.0195,
      obrera: sbc * diasTrabajados * 0.0065,
    },
    invalidezVida: {
      patronal: sbc * diasTrabajados * 0.0175,
      obrera: sbc * diasTrabajados * 0.00625,
    },
    retiro: {
      patronal: sbc * diasTrabajados * 0.02,
      obrera: 0,
    },
    cesantia: {
      patronal: sbc * diasTrabajados * 0.0315,
      obrera: sbc * diasTrabajados * 0.01125,
    },
    infonavit: {
      patronal: sbc * diasTrabajados * 0.05,
      obrera: 0,
    },
  };
}
```

### 5.2 Servicio de Nómina

```typescript
// payroll/payroll.service.ts
@Injectable()
export class PayrollService {
  async calculatePayroll(employeeId: string, periodId: string): Promise<PayrollResult> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { company: true },
    });

    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });

    const workedDays = await this.calculateWorkedDays(employeeId, period);
    const incidents = await this.getIncidents(employeeId, period);

    // Percepciones
    const earnings = {
      salario: employee.baseSalary * workedDays,
      horasExtra: this.calculateOvertime(employeeId, period),
      aguinaldo: this.calculateAguinaldo(employee, period),
      primaVacacional: this.calculatePrimaVacacional(employee, period),
    };

    // Deducciones
    const deductions = {
      isr: this.calculateISR(earnings.salario),
      imss: this.calculateIMSS(employee.baseSalary, workedDays),
      infonavit: this.calculateInfonavit(employee),
    };

    const totalEarnings = Object.values(earnings).reduce((a, b) => a + b, 0);
    const totalDeductions = Object.values(deductions).reduce((a, b) => a + b, 0);
    const netPay = totalEarnings - totalDeductions;

    return {
      employeeId,
      periodId,
      workedDays,
      earnings,
      deductions,
      totalEarnings,
      totalDeductions,
      netPay,
    };
  }
}
```

---

## 6. Generación de CFDI

### 6.1 Estructura XML Nómina 1.2

```xml
<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:nomina12="http://www.sat.gob.mx/nomina12"
  Version="4.0"
  TipoDeComprobante="N">

  <cfdi:Emisor Rfc="XXX000000XXX" Nombre="Empresa SA" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="XXXX000000XXX" Nombre="Juan Pérez" UsoCFDI="CN01"/>

  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111505" Cantidad="1"
      ClaveUnidad="ACT" Descripcion="Pago de nómina"/>
  </cfdi:Conceptos>

  <cfdi:Complemento>
    <nomina12:Nomina Version="1.2" TipoNomina="O" FechaPago="2024-12-15">
      <nomina12:Emisor RegistroPatronal="A12345678"/>
      <nomina12:Receptor NumEmpleado="001" CURP="XXXX000000XXXXXX00"/>
      <nomina12:Percepciones TotalSueldos="10000.00" TotalGravado="8000.00">
        <nomina12:Percepcion TipoPercepcion="001" Clave="001"
          Concepto="Sueldo" ImporteGravado="8000.00" ImporteExento="2000.00"/>
      </nomina12:Percepciones>
      <nomina12:Deducciones TotalImpuestosRetenidos="1200.00">
        <nomina12:Deduccion TipoDeduccion="002" Clave="002"
          Concepto="ISR" Importe="1200.00"/>
      </nomina12:Deducciones>
    </nomina12:Nomina>
  </cfdi:Complemento>
</cfdi:Comprobante>
```

### 6.2 Servicio CFDI

```typescript
// cfdi/cfdi.service.ts
@Injectable()
export class CfdiService {
  async generateCFDI(payrollId: string): Promise<string> {
    const payroll = await this.getPayrollWithRelations(payrollId);

    // Construir XML
    const xml = this.buildXML(payroll);

    // Sellar con certificado
    const sealedXml = await this.sealXML(xml, payroll.company);

    return sealedXml;
  }

  async stampCFDI(xml: string, company: Company): Promise<StampResult> {
    const pacConfig = this.getPacConfig(company);

    // Enviar al PAC
    const response = await this.pacClient.stamp(xml, pacConfig);

    return {
      uuid: response.uuid,
      stampedXml: response.xml,
      stampDate: response.date,
    };
  }

  private async sealXML(xml: string, company: Company): Promise<string> {
    // Obtener cadena original
    const cadenaOriginal = this.getCadenaOriginal(xml);

    // Firmar con llave privada
    const key = this.decryptKey(company.certificadoKey, company.certificadoPassword);
    const sello = this.sign(cadenaOriginal, key);

    // Agregar sello al XML
    return this.addSello(xml, sello, company.noCertificado);
  }
}
```

---

## 7. Testing

### 7.1 Tests Unitarios (Backend)

```typescript
// employees/employees.service.spec.ts
describe('EmployeesService', () => {
  let service: EmployeesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: PrismaService,
          useValue: {
            employee: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create employee', async () => {
    const dto = { firstName: 'Juan', lastName: 'Pérez', ... };

    jest.spyOn(prisma.employee, 'create').mockResolvedValue({ id: '1', ...dto });

    const result = await service.create(dto);

    expect(result).toHaveProperty('id');
    expect(prisma.employee.create).toHaveBeenCalledWith({ data: dto });
  });
});
```

### 7.2 Tests E2E (Backend)

```typescript
// test/employees.e2e-spec.ts
describe('Employees (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login para obtener token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'password' });

    token = loginResponse.body.token;
  });

  it('/employees (GET)', () => {
    return request(app.getHttpServer())
      .get('/employees')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});
```

### 7.3 Tests Frontend

```typescript
// __tests__/EmployeesPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmployeesPage from '../pages/EmployeesPage';

const queryClient = new QueryClient();

describe('EmployeesPage', () => {
  it('renders employee list', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <EmployeesPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Empleados')).toBeInTheDocument();
    });
  });
});
```

---

## 8. Debugging

### 8.1 Logs de Backend

```typescript
// Usar Logger de NestJS
import { Logger } from '@nestjs/common';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  async calculate(id: string) {
    this.logger.log(`Calculando nómina para ${id}`);
    try {
      // ...
      this.logger.debug('Detalles del cálculo', result);
    } catch (error) {
      this.logger.error(`Error en cálculo: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

### 8.2 Debugging Frontend

```typescript
// React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

// Console debugging
useEffect(() => {
  console.log('State changed:', state);
}, [state]);
```

---

## 9. Comandos Útiles

### 9.1 Backend

```bash
# Desarrollo
npm run start:dev

# Build producción
npm run build

# Tests
npm run test
npm run test:e2e
npm run test:cov

# Linting
npm run lint
npm run format

# Prisma
npx prisma studio
npx prisma migrate dev
npx prisma db seed
```

### 9.2 Frontend

```bash
# Desarrollo
npm run dev

# Build
npm run build
npm run preview

# Tests
npm run test

# Linting
npm run lint
```

### 9.3 Docker

```bash
# Desarrollo
docker compose -f docker-compose.dev.yml up --build
docker compose -f docker-compose.dev.yml down

# Logs
docker logs -f nomina-backend-dev

# Acceso a contenedor
docker exec -it nomina-backend-dev sh

# Migraciones en Docker
docker exec nomina-backend-dev npx prisma migrate dev
```

---

*Manual Técnico v1.0*
*Última actualización: Diciembre 2024*
