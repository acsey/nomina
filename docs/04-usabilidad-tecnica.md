# Documento de Usabilidad Técnica - Sistema de Nómina

## 1. Principios de Usabilidad

### 1.1 Principios de Diseño Aplicados

#### Consistencia
- Patrones de UI uniformes en toda la aplicación
- Iconografía coherente (Heroicons)
- Paleta de colores consistente basada en Tailwind CSS
- Tipografía uniforme (sistema nativo)

#### Retroalimentación
- Notificaciones toast para acciones del usuario
- Estados de carga visibles (spinners, skeletons)
- Mensajes de error claros y descriptivos
- Confirmaciones para acciones destructivas

#### Prevención de Errores
- Validación en tiempo real de formularios
- Campos requeridos claramente marcados
- Formatos de datos validados (RFC, CURP, email)
- Confirmación antes de eliminar registros

#### Flexibilidad
- Modo oscuro/claro
- Diseño responsive (móvil, tablet, escritorio)
- Múltiples formas de navegación
- Atajos de teclado

---

## 2. Arquitectura de la Interfaz

### 2.1 Layout Principal

```
┌────────────────────────────────────────────────────────────┐
│                      BARRA SUPERIOR                         │
│  [☰ Menú]         [Logo]              [🌙] [usuario@email] │
├──────────┬─────────────────────────────────────────────────┤
│          │                                                  │
│  MENÚ    │              CONTENIDO PRINCIPAL                │
│  LATERAL │                                                  │
│          │  ┌────────────────────────────────────────────┐ │
│ Dashboard│  │  Título de Página                          │ │
│ Empleados│  │  Descripción / Breadcrumbs                 │ │
│ Nómina   │  ├────────────────────────────────────────────┤ │
│ ...      │  │                                            │ │
│          │  │  Contenido dinámico                        │ │
│          │  │  (tablas, formularios, cards)              │ │
│          │  │                                            │ │
│          │  └────────────────────────────────────────────┘ │
│          │                                                  │
├──────────┴─────────────────────────────────────────────────┤
│                    [Usuario] [Cerrar sesión]               │
└────────────────────────────────────────────────────────────┘
```

### 2.2 Breakpoints Responsive

| Breakpoint | Tamaño | Comportamiento |
|------------|--------|----------------|
| sm | 640px+ | Menú colapsable |
| md | 768px+ | Columnas adaptativas |
| lg | 1024px+ | Sidebar fijo |
| xl | 1280px+ | Contenido expandido |

### 2.3 Componentes Principales

#### Navegación Lateral
- Iconos descriptivos
- Texto de etiqueta
- Indicador de sección activa
- Scroll para menús largos
- Información del usuario al final

#### Barra Superior
- Botón de menú móvil
- Toggle de tema
- Información de usuario

---

## 3. Patrones de Interacción

### 3.1 Formularios

#### Estructura Estándar
```jsx
<form>
  <label>Campo requerido *</label>
  <input type="text" required />
  <span class="error">Mensaje de error</span>

  <div class="actions">
    <button type="button">Cancelar</button>
    <button type="submit">Guardar</button>
  </div>
</form>
```

#### Validación
- **Tiempo real**: Mientras el usuario escribe
- **On blur**: Al salir del campo
- **On submit**: Al enviar formulario

#### Estados de Campo
| Estado | Estilo |
|--------|--------|
| Normal | Borde gris |
| Focus | Borde primario + sombra |
| Error | Borde rojo + mensaje |
| Disabled | Fondo gris, cursor not-allowed |
| Success | Borde verde |

### 3.2 Tablas de Datos

#### Características
- Ordenamiento por columnas
- Búsqueda/filtrado
- Paginación
- Selección múltiple
- Acciones por fila

#### Ejemplo de Uso
```jsx
<Table>
  <TableHeader>
    <Column sortable>Nombre</Column>
    <Column sortable>Email</Column>
    <Column>Acciones</Column>
  </TableHeader>
  <TableBody>
    {data.map(row => (
      <TableRow key={row.id}>
        <Cell>{row.name}</Cell>
        <Cell>{row.email}</Cell>
        <Cell>
          <Button icon="edit" />
          <Button icon="delete" />
        </Cell>
      </TableRow>
    ))}
  </TableBody>
  <Pagination />
</Table>
```

### 3.3 Modales

#### Tipos de Modales
| Tipo | Uso |
|------|-----|
| Confirmación | Acciones destructivas |
| Formulario | Crear/editar registros |
| Información | Mostrar detalles |
| Alerta | Errores críticos |

#### Comportamiento
- Overlay oscuro
- Cierre con Escape o clic fuera
- Focus trap dentro del modal
- Scroll interno si contenido largo

### 3.4 Notificaciones (Toast)

#### Tipos
| Tipo | Color | Duración |
|------|-------|----------|
| Success | Verde | 3s |
| Error | Rojo | 5s |
| Warning | Amarillo | 4s |
| Info | Azul | 3s |

#### Posición
- Esquina superior derecha
- Apilamiento vertical
- Desaparición automática
- Botón de cierre manual

---

## 4. Sistema de Colores

### 4.1 Paleta Principal

```css
/* Colores dinámicos (tema de empresa) */
--color-primary-50: hsl(var(--h), var(--s), 97%);
--color-primary-100: hsl(var(--h), var(--s), 94%);
--color-primary-500: hsl(var(--h), var(--s), 54%);
--color-primary-600: hsl(var(--h), var(--s), 43%);
--color-primary-700: hsl(var(--h), var(--s), 32%);
```

### 4.2 Colores Semánticos

| Color | Uso |
|-------|-----|
| Verde (green-500) | Éxito, activo |
| Rojo (red-500) | Error, peligro, eliminar |
| Amarillo (yellow-500) | Advertencia |
| Azul (blue-500) | Información |
| Gris (gray-500) | Neutral, deshabilitado |

### 4.3 Modo Oscuro

| Elemento | Modo Claro | Modo Oscuro |
|----------|------------|-------------|
| Fondo | gray-100 | gray-900 |
| Tarjetas | white | gray-800 |
| Texto | gray-900 | white |
| Bordes | gray-200 | gray-700 |
| Hover | gray-100 | gray-700 |

---

## 5. Tipografía

### 5.1 Escala Tipográfica

| Clase | Tamaño | Uso |
|-------|--------|-----|
| text-xs | 12px | Labels, hints |
| text-sm | 14px | Texto secundario |
| text-base | 16px | Texto principal |
| text-lg | 18px | Subtítulos |
| text-xl | 20px | Títulos de sección |
| text-2xl | 24px | Títulos de página |

### 5.2 Pesos

| Peso | Clase | Uso |
|------|-------|-----|
| 400 | font-normal | Texto general |
| 500 | font-medium | Énfasis leve |
| 600 | font-semibold | Títulos, labels |
| 700 | font-bold | Énfasis fuerte |

---

## 6. Espaciado

### 6.1 Sistema de Espaciado

Basado en escala de 4px:

| Clase | Valor | Uso |
|-------|-------|-----|
| p-1 | 4px | Mínimo |
| p-2 | 8px | Entre elementos pequeños |
| p-4 | 16px | Padding estándar |
| p-6 | 24px | Separación de secciones |
| p-8 | 32px | Padding de página |

### 6.2 Gaps en Grid/Flex

```css
gap-2   /* 8px - elementos relacionados */
gap-4   /* 16px - elementos en grupo */
gap-6   /* 24px - secciones */
gap-8   /* 32px - áreas principales */
```

---

## 7. Iconografía

### 7.1 Biblioteca
- **Heroicons** (Tailwind Labs)
- Estilo: Outline (24px)

### 7.2 Iconos Comunes

| Acción | Icono |
|--------|-------|
| Crear | PlusIcon |
| Editar | PencilIcon |
| Eliminar | TrashIcon |
| Ver | EyeIcon |
| Buscar | MagnifyingGlassIcon |
| Filtrar | FunnelIcon |
| Descargar | ArrowDownTrayIcon |
| Configurar | CogIcon |
| Usuario | UserIcon |
| Cerrar | XMarkIcon |

---

## 8. Estados de Carga

### 8.1 Spinner Global
```jsx
<div className="flex justify-center items-center h-64">
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
</div>
```

### 8.2 Skeleton Loading
Para tablas y listas, usar placeholders animados que indiquen la estructura del contenido.

### 8.3 Estados de Botón

| Estado | Visual |
|--------|--------|
| Normal | Color sólido |
| Hover | Color más oscuro |
| Active | Color aún más oscuro |
| Loading | Spinner + texto "Cargando..." |
| Disabled | Opacidad reducida, cursor bloqueado |

---

## 9. Accesibilidad

### 9.1 WCAG 2.1 Nivel AA

#### Contraste
- Texto normal: ratio mínimo 4.5:1
- Texto grande: ratio mínimo 3:1
- Iconos: ratio mínimo 3:1

#### Navegación por Teclado
- Tab para navegar entre elementos
- Enter/Space para activar
- Escape para cerrar modales
- Flechas en menús desplegables

### 9.2 Atributos ARIA

```jsx
// Botón con solo icono
<button aria-label="Eliminar empleado">
  <TrashIcon />
</button>

// Región de contenido
<main role="main" aria-label="Contenido principal">

// Estados
<button aria-disabled="true" aria-busy="true">
```

### 9.3 Focus Visible
```css
:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

---

## 10. Performance de UI

### 10.1 Optimizaciones

#### Lazy Loading
- Rutas cargadas bajo demanda
- Imágenes con loading="lazy"
- Componentes grandes diferidos

#### Memoización
```jsx
// Evitar re-renders innecesarios
const MemoizedComponent = React.memo(Component);
const cachedValue = useMemo(() => compute(), [deps]);
const cachedFn = useCallback(() => action(), [deps]);
```

#### Debounce en Búsquedas
```jsx
// Esperar 300ms después de dejar de escribir
const debouncedSearch = useMemo(
  () => debounce((term) => search(term), 300),
  []
);
```

### 10.2 Métricas Objetivo

| Métrica | Objetivo |
|---------|----------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Largest Contentful Paint | < 2.5s |
| Cumulative Layout Shift | < 0.1 |

---

## 11. Manejo de Errores en UI

### 11.1 Tipos de Error

#### Error de Validación
- Mensaje inline bajo el campo
- Color rojo, icono de alerta
- Scroll automático al primer error

#### Error de API
- Toast de error con mensaje
- Opción de reintentar si aplica
- Log en consola para debugging

#### Error Crítico
- Pantalla de error completa
- Botón para recargar
- Información de contacto soporte

### 11.2 Mensajes de Error

| Tipo | Ejemplo |
|------|---------|
| Campo requerido | "Este campo es obligatorio" |
| Formato inválido | "Ingrese un RFC válido (Ej: XXXX000000XXX)" |
| Longitud | "Mínimo 8 caracteres" |
| Único | "Este email ya está registrado" |
| Servidor | "Error al guardar. Intente nuevamente." |

---

## 12. Testing de Usabilidad

### 12.1 Checklist de UI

- [ ] Textos legibles y sin truncar
- [ ] Botones con tamaño mínimo 44x44px
- [ ] Espaciado adecuado entre elementos
- [ ] Colores con contraste suficiente
- [ ] Estados de carga visibles
- [ ] Errores claros y accionables
- [ ] Navegación por teclado funcional
- [ ] Responsive en todos los breakpoints

### 12.2 Herramientas de Testing

| Herramienta | Propósito |
|-------------|-----------|
| Chrome DevTools | Responsive, performance |
| Lighthouse | Accesibilidad, performance |
| axe DevTools | Accesibilidad |
| React DevTools | Componentes, rerenders |

---

*Documento de Usabilidad Técnica v1.0*
*Última actualización: Diciembre 2024*
