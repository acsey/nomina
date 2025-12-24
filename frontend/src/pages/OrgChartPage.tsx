import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  pointerWithin,
} from '@dnd-kit/core';
import toast from 'react-hot-toast';
import {
  UserCircleIcon,
  UsersIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  ArrowsPointingOutIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  UserIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import { hierarchyApi, catalogsApi, employeesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ChainMember {
  level: number;
  employeeId: string;
  employeeNumber: string;
  name: string;
  jobPosition: string;
  canApprove: boolean;
  isDelegated: boolean;
  delegatedFrom?: string;
}

interface HierarchyNode {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobPosition: string;
  department: string;
  email: string | null;
  level: number;
  supervisorId: string | null;
  subordinates: HierarchyNode[];
}

interface Delegation {
  id: string;
  delegatorId: string;
  delegateeId: string;
  delegationType: string;
  startDate: string;
  endDate?: string;
  reason?: string;
  isActive: boolean;
  delegator?: { firstName: string; lastName: string };
  delegatee?: { firstName: string; lastName: string; jobPosition?: { name: string } };
}

const DELEGATION_TYPES = [
  { value: 'ALL', label: 'Todas las autorizaciones' },
  { value: 'VACATION', label: 'Vacaciones' },
  { value: 'PERMISSION', label: 'Permisos' },
  { value: 'INCIDENT', label: 'Incidencias' },
];

// Colores para los niveles del organigrama
const LEVEL_COLORS = [
  { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white', light: 'bg-blue-50 dark:bg-blue-900/30' },
  { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-white', light: 'bg-emerald-50 dark:bg-emerald-900/30' },
  { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-white', light: 'bg-purple-50 dark:bg-purple-900/30' },
  { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white', light: 'bg-orange-50 dark:bg-orange-900/30' },
  { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-white', light: 'bg-pink-50 dark:bg-pink-900/30' },
  { bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-white', light: 'bg-cyan-50 dark:bg-cyan-900/30' },
];

// Draggable Card Component
interface DraggableCardProps {
  node: HierarchyNode;
  level: number;
  isSelected: boolean;
  onSelect: (node: HierarchyNode) => void;
  scale: number;
  canDrag: boolean;
  isDragging?: boolean;
}

function DraggableCard({ node, level, isSelected, onSelect, scale, canDrag, isDragging }: DraggableCardProps) {
  const colors = LEVEL_COLORS[level % LEVEL_COLORS.length];

  const { attributes, listeners, setNodeRef: setDragRef, transform } = useDraggable({
    id: `drag-${node.id}`,
    data: { node, type: 'employee' },
    disabled: !canDrag,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${node.id}`,
    data: { node, type: 'employee' },
    disabled: !canDrag,
  });

  const hasSubordinates = node.subordinates.length > 0;

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div className="flex flex-col items-center">
      {/* Card del empleado */}
      <div
        ref={(el) => {
          setDragRef(el);
          setDropRef(el);
        }}
        onClick={() => onSelect(node)}
        style={style}
        {...(canDrag ? { ...attributes, ...listeners } : {})}
        className={`
          relative transition-all duration-200 rounded-lg shadow-lg
          ${isSelected ? 'ring-4 ring-primary-400 ring-offset-2 dark:ring-offset-gray-900' : ''}
          ${!isDragging && !isOver ? 'hover:shadow-xl hover:-translate-y-1' : ''}
          ${colors.light} border-2 ${colors.border}
          ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
          ${isDragging ? 'opacity-50' : ''}
          ${isOver ? 'ring-4 ring-green-400 ring-offset-2 scale-105' : ''}
        `}
        style={{
          ...style,
          minWidth: `${Math.max(140, 180 * scale)}px`,
          maxWidth: `${Math.max(160, 220 * scale)}px`,
        }}
      >
        {/* Header con color */}
        <div className={`${colors.bg} ${colors.text} px-3 py-2 rounded-t-md`}>
          <p className="font-semibold text-sm truncate text-center">
            {node.fullName}
          </p>
        </div>

        {/* Contenido */}
        <div className="p-3 bg-white dark:bg-gray-800 rounded-b-md">
          <p className="text-xs text-gray-600 dark:text-gray-300 text-center truncate font-medium">
            {node.jobPosition || 'Sin puesto'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center truncate mt-1">
            {node.department || 'Sin departamento'}
          </p>
          {hasSubordinates && (
            <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <UsersIcon className="h-3 w-3" />
              <span>{node.subordinates.length}</span>
            </div>
          )}
        </div>

        {/* Indicador de nivel */}
        <div className={`absolute -top-2 -right-2 ${colors.bg} ${colors.text} text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow`}>
          {level}
        </div>

        {/* Indicador de arrastrable */}
        {canDrag && (
          <div className="absolute -top-2 -left-2 bg-gray-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow">
            <ArrowsUpDownIcon className="h-3 w-3" />
          </div>
        )}

        {/* Drop indicator */}
        {isOver && (
          <div className="absolute inset-0 bg-green-500/20 rounded-lg flex items-center justify-center">
            <span className="text-xs font-bold text-green-600 bg-white px-2 py-1 rounded shadow">
              Soltar aqui
            </span>
          </div>
        )}
      </div>

      {/* Linea vertical hacia abajo */}
      {hasSubordinates && (
        <div className="w-0.5 h-6 bg-gray-300 dark:bg-gray-600" />
      )}

      {/* Subordinados */}
      {hasSubordinates && (
        <div className="relative">
          {node.subordinates.length > 1 && (
            <div
              className="absolute top-0 h-0.5 bg-gray-300 dark:bg-gray-600"
              style={{
                left: '50%',
                right: '50%',
                transform: 'translateX(-50%)',
                width: `calc(100% - ${Math.max(140, 180 * scale)}px)`,
              }}
            />
          )}

          <div className="flex gap-4 pt-6">
            {node.subordinates.map((sub) => (
              <div key={sub.id} className="relative flex flex-col items-center">
                <div className="absolute -top-6 w-0.5 h-6 bg-gray-300 dark:bg-gray-600" />
                <DraggableCard
                  node={sub}
                  level={level + 1}
                  isSelected={isSelected}
                  onSelect={onSelect}
                  scale={scale}
                  canDrag={canDrag}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Drag Overlay Card (shown while dragging)
function DragOverlayCard({ node, level }: { node: HierarchyNode; level: number }) {
  const colors = LEVEL_COLORS[level % LEVEL_COLORS.length];

  return (
    <div
      className={`
        rounded-lg shadow-2xl ${colors.light} border-2 ${colors.border}
        transform rotate-3 opacity-90
      `}
      style={{ minWidth: '160px', maxWidth: '200px' }}
    >
      <div className={`${colors.bg} ${colors.text} px-3 py-2 rounded-t-md`}>
        <p className="font-semibold text-sm truncate text-center">
          {node.fullName}
        </p>
      </div>
      <div className="p-3 bg-white dark:bg-gray-800 rounded-b-md">
        <p className="text-xs text-gray-600 dark:text-gray-300 text-center truncate font-medium">
          {node.jobPosition || 'Sin puesto'}
        </p>
      </div>
    </div>
  );
}

// Remove Supervisor Drop Zone
function RemoveSupervisorZone({ isOver, canDrag }: { isOver: boolean; canDrag: boolean }) {
  const { setNodeRef } = useDroppable({
    id: 'remove-supervisor',
    data: { type: 'remove-supervisor' },
    disabled: !canDrag,
  });

  if (!canDrag) return null;

  return (
    <div
      ref={setNodeRef}
      className={`
        p-4 border-2 border-dashed rounded-lg text-center transition-all
        ${isOver
          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
        }
      `}
    >
      <TrashIcon className={`h-6 w-6 mx-auto mb-2 ${isOver ? 'text-red-500' : 'text-gray-400'}`} />
      <p className={`text-sm font-medium ${isOver ? 'text-red-600' : 'text-gray-500'}`}>
        {isOver ? 'Soltar para quitar supervisor' : 'Arrastra aqui para quitar supervisor'}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        El empleado quedara en el nivel mas alto
      </p>
    </div>
  );
}

export default function OrgChartPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [scale, setScale] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeNode, setActiveNode] = useState<HierarchyNode | null>(null);
  const [delegationForm, setDelegationForm] = useState({
    delegateeId: '',
    delegationType: 'ALL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    reason: '',
  });

  // Check if user can edit org chart
  const canEditOrgChart = user?.role === 'admin' || user?.role === 'rh' || user?.role === 'super_admin';

  // Get companies
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
  });

  const companies = companiesData?.data || [];

  // Get current user's employee record (for showing personal hierarchy)
  const { data: myEmployeeData } = useQuery({
    queryKey: ['my-employee-for-chart', user?.email],
    queryFn: async () => {
      const response = await employeesApi.getByEmail(user?.email || '');
      return response.data;
    },
    enabled: !!user?.email,
    retry: false,
  });

  const myEmployeeId = myEmployeeData?.id;

  // Get my hierarchy chain (my supervisors)
  const { data: myChainData } = useQuery({
    queryKey: ['my-hierarchy-chain', myEmployeeId],
    queryFn: () => hierarchyApi.getEmployeeChain(myEmployeeId!),
    enabled: !!myEmployeeId,
  });

  const myChain: ChainMember[] = myChainData?.data || [];

  // Get org chart
  const { data: orgChartData, isLoading, refetch } = useQuery({
    queryKey: ['org-chart', selectedCompany],
    queryFn: () => hierarchyApi.getOrgChart(selectedCompany || undefined),
  });

  // Get employees for delegation dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.getAll(),
  });

  const employees = employeesData?.data || [];

  // Get delegations for selected employee
  const { data: delegationsData, isLoading: loadingDelegations } = useQuery({
    queryKey: ['delegations', selectedNode?.id],
    queryFn: () => hierarchyApi.getDelegations(selectedNode!.id),
    enabled: !!selectedNode,
  });

  const delegations: Delegation[] = delegationsData?.data || [];

  // Update supervisor mutation
  const updateSupervisorMutation = useMutation({
    mutationFn: ({ employeeId, supervisorId }: { employeeId: string; supervisorId: string | null }) =>
      hierarchyApi.setSupervisor(employeeId, supervisorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-chart'] });
      queryClient.invalidateQueries({ queryKey: ['my-hierarchy-chain'] });
      toast.success('Jerarquia actualizada correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar jerarquia');
    },
  });

  // Create delegation mutation
  const createDelegationMutation = useMutation({
    mutationFn: (data: any) => hierarchyApi.createDelegation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations', selectedNode?.id] });
      setShowDelegationModal(false);
      setDelegationForm({
        delegateeId: '',
        delegationType: 'ALL',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        reason: '',
      });
    },
  });

  // Revoke delegation mutation
  const revokeDelegationMutation = useMutation({
    mutationFn: (delegationId: string) => hierarchyApi.revokeDelegation(delegationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations', selectedNode?.id] });
    },
  });

  const orgChart: HierarchyNode[] = orgChartData?.data || [];

  // Filter nodes by search term
  const filterNodes = useCallback((nodes: HierarchyNode[], term: string): HierarchyNode[] => {
    if (!term) return nodes;

    const filterNode = (node: HierarchyNode): HierarchyNode | null => {
      const matches =
        node.fullName.toLowerCase().includes(term.toLowerCase()) ||
        node.employeeNumber.toLowerCase().includes(term.toLowerCase()) ||
        node.jobPosition.toLowerCase().includes(term.toLowerCase());

      const filteredSubordinates = node.subordinates
        .map(filterNode)
        .filter((n): n is HierarchyNode => n !== null);

      if (matches || filteredSubordinates.length > 0) {
        return { ...node, subordinates: filteredSubordinates };
      }
      return null;
    };

    return nodes.map(filterNode).filter((n): n is HierarchyNode => n !== null);
  }, []);

  const filteredOrgChart = filterNodes(orgChart, searchTerm);

  // Count total employees
  const countEmployees = (nodes: HierarchyNode[]): number => {
    return nodes.reduce((acc, n) => acc + 1 + countEmployees(n.subordinates), 0);
  };

  const totalEmployees = countEmployees(orgChart);

  // Find node by id
  const findNodeById = (nodes: HierarchyNode[], id: string): HierarchyNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNodeById(node.subordinates, id);
      if (found) return found;
    }
    return null;
  };

  // Zoom controls
  const zoomIn = () => setScale((s) => Math.min(s + 0.1, 1.5));
  const zoomOut = () => setScale((s) => Math.max(s - 0.1, 0.5));
  const resetZoom = () => setScale(1);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const nodeId = String(active.id).replace('drag-', '');
    const node = findNodeById(orgChart, nodeId);
    setActiveId(String(active.id));
    setActiveNode(node);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveNode(null);

    if (!over) return;

    const draggedNodeId = String(active.id).replace('drag-', '');
    const overId = String(over.id);

    // Handle remove supervisor
    if (overId === 'remove-supervisor') {
      updateSupervisorMutation.mutate({
        employeeId: draggedNodeId,
        supervisorId: null,
      });
      return;
    }

    // Handle drop on another employee
    if (overId.startsWith('drop-')) {
      const targetNodeId = overId.replace('drop-', '');

      // Can't drop on self
      if (draggedNodeId === targetNodeId) return;

      // Can't drop on own subordinate (would create circular reference)
      const draggedNode = findNodeById(orgChart, draggedNodeId);
      if (draggedNode) {
        const isSubordinate = (node: HierarchyNode, targetId: string): boolean => {
          if (node.id === targetId) return true;
          return node.subordinates.some((sub) => isSubordinate(sub, targetId));
        };
        if (isSubordinate(draggedNode, targetNodeId)) {
          toast.error('No puedes asignar un subordinado como tu supervisor');
          return;
        }
      }

      updateSupervisorMutation.mutate({
        employeeId: draggedNodeId,
        supervisorId: targetNodeId,
      });
    }
  };

  // Handle create delegation
  const handleCreateDelegation = () => {
    if (!selectedNode || !delegationForm.delegateeId) return;
    createDelegationMutation.mutate({
      delegatorId: selectedNode.id,
      delegateeId: delegationForm.delegateeId,
      delegationType: delegationForm.delegationType,
      startDate: delegationForm.startDate,
      endDate: delegationForm.endDate || undefined,
      reason: delegationForm.reason || undefined,
    });
  };

  // Get delegation type label
  const getDelegationTypeLabel = (type: string) => {
    return DELEGATION_TYPES.find(t => t.value === type)?.label || type;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <div className="space-y-4 h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Organigrama</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Estructura jerarquica de la organizacion
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canEditOrgChart && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`btn text-sm py-1.5 ${editMode ? 'btn-primary' : 'btn-secondary'}`}
              >
                <ArrowsUpDownIcon className="h-4 w-4 mr-1" />
                {editMode ? 'Modo edicion activo' : 'Editar organigrama'}
              </button>
            )}
            {companies.length > 1 && (
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="input text-sm py-1.5"
              >
                <option value="">Todas las empresas</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Edit mode instructions */}
        {editMode && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ArrowsUpDownIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">Modo edicion activo</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Arrastra las tarjetas para reorganizar la jerarquia:
                </p>
                <ul className="text-sm text-amber-600 dark:text-amber-500 mt-2 space-y-1">
                  <li>• Suelta sobre otro empleado para asignarlo como su subordinado</li>
                  <li>• Suelta en la zona roja para quitar el supervisor (nivel mas alto)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Mi Cadena de Mando - visible for all employees */}
        {myEmployeeData && !editMode && (
          <div className="card dark:bg-gray-800 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20">
            <div className="flex items-center gap-2 mb-3">
              <UserIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Mi Cadena de Mando</h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Yo */}
              <div className="flex items-center gap-2 px-3 py-2 bg-primary-500 text-white rounded-lg shadow">
                <UserCircleIcon className="h-6 w-6" />
                <div className="text-sm">
                  <p className="font-semibold">{myEmployeeData.firstName} {myEmployeeData.lastName}</p>
                  <p className="text-xs text-primary-100">{myEmployeeData.jobPosition?.name || 'Sin puesto'}</p>
                </div>
              </div>

              {/* Flecha y supervisores */}
              {myChain.length > 0 ? (
                myChain.map((supervisor, index) => (
                  <div key={supervisor.employeeId} className="flex items-center gap-2">
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow ${
                        index === 0
                          ? 'bg-emerald-500 text-white'
                          : index === 1
                          ? 'bg-purple-500 text-white'
                          : 'bg-orange-500 text-white'
                      }`}
                      onClick={() => {
                        const node = findNodeById(orgChart, supervisor.employeeId);
                        if (node) setSelectedNode(node);
                      }}
                    >
                      <UserCircleIcon className="h-6 w-6" />
                      <div className="text-sm">
                        <p className="font-semibold">{supervisor.name}</p>
                        <p className={`text-xs ${index === 0 ? 'text-emerald-100' : index === 1 ? 'text-purple-100' : 'text-orange-100'}`}>
                          {supervisor.jobPosition || 'Sin puesto'}
                          {index === 0 && ' (Mi jefe directo)'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ml-2">
                  <ChevronRightIcon className="h-5 w-5 text-gray-300" />
                  <span className="italic">Sin supervisor asignado</span>
                </div>
              )}
            </div>

            {myChain.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                Haz clic en cualquier supervisor para ver sus detalles en el organigrama
              </p>
            )}
          </div>
        )}

        {/* Remove supervisor zone */}
        {editMode && (
          <RemoveSupervisorZone isOver={activeId !== null} canDrag={editMode} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Org Chart Visual */}
          <div className="lg:col-span-3 card dark:bg-gray-800 overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar empleado..."
                  className="input pl-9 py-1.5 text-sm w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={zoomOut} className="btn-secondary text-xs py-1.5 px-2" title="Alejar">
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button onClick={zoomIn} className="btn-secondary text-xs py-1.5 px-2" title="Acercar">
                  <PlusIcon className="h-4 w-4" />
                </button>
                <button onClick={resetZoom} className="btn-secondary text-xs py-1.5 px-2" title="Restablecer zoom">
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                </button>
                <button onClick={() => refetch()} className="btn-secondary text-xs py-1.5 px-2" title="Actualizar">
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <UsersIcon className="h-4 w-4" />
                {totalEmployees} empleados
              </span>
              <span className="flex items-center gap-1">
                <BuildingOfficeIcon className="h-4 w-4" />
                {orgChart.length} niveles superiores
              </span>
              {editMode && (
                <span className="flex items-center gap-1 text-amber-600">
                  <ArrowsUpDownIcon className="h-4 w-4" />
                  Arrastra para reorganizar
                </span>
              )}
            </div>

            {/* Chart Container */}
            <div
              ref={containerRef}
              className="overflow-auto bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
              style={{ minHeight: '500px', maxHeight: 'calc(100vh - 300px)' }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
                </div>
              ) : filteredOrgChart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96">
                  <UsersIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    {searchTerm ? 'No se encontraron empleados' : 'No hay estructura jerarquica definida'}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    {searchTerm ? 'Intenta con otro termino de busqueda' : 'Asigna supervisores a los empleados para crear el organigrama'}
                  </p>
                </div>
              ) : (
                <div
                  className="p-8 inline-block min-w-full"
                  style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
                >
                  <div className="org-tree flex justify-center gap-8">
                    {filteredOrgChart.map((node) => (
                      <DraggableCard
                        key={node.id}
                        node={node}
                        level={0}
                        isSelected={selectedNode?.id === node.id}
                        onSelect={setSelectedNode}
                        scale={scale}
                        canDrag={editMode}
                        isDragging={activeId === `drag-${node.id}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Leyenda */}
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Niveles:</span>
              {LEVEL_COLORS.map((color, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className={`w-3 h-3 rounded ${color.bg}`}></span>
                  Nivel {i}
                </span>
              ))}
            </div>
          </div>

          {/* Details Panel */}
          <div className="card dark:bg-gray-800 h-fit">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              Detalles del Empleado
            </h2>

            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`${LEVEL_COLORS[selectedNode.level % LEVEL_COLORS.length].bg} p-3 rounded-full`}>
                    <UserCircleIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedNode.fullName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedNode.employeeNumber}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Puesto</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedNode.jobPosition || 'No asignado'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Departamento</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedNode.department || 'No asignado'}
                    </p>
                  </div>

                  {selectedNode.email && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Correo</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white break-all">
                        {selectedNode.email}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nivel jerarquico</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Nivel {selectedNode.level}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subordinados directos</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedNode.subordinates.length} personas
                    </p>
                  </div>
                </div>

                {selectedNode.subordinates.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Equipo directo</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selectedNode.subordinates.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                          onClick={() => setSelectedNode(sub)}
                        >
                          <UserCircleIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{sub.fullName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{sub.jobPosition}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delegations Section */}
                <div className="border-t dark:border-gray-700 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delegaciones</p>
                    <button
                      onClick={() => setShowDelegationModal(true)}
                      className="p-1 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                      title="Crear delegacion"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {loadingDelegations ? (
                    <div className="flex justify-center py-2">
                      <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />
                    </div>
                  ) : delegations.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">Sin delegaciones activas</p>
                  ) : (
                    <div className="space-y-2">
                      {delegations.filter(d => d.isActive).map((delegation) => (
                        <div
                          key={delegation.id}
                          className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-amber-800 dark:text-amber-300">
                                {getDelegationTypeLabel(delegation.delegationType)}
                              </p>
                              <p className="text-amber-700 dark:text-amber-400">
                                A: {delegation.delegatee?.firstName} {delegation.delegatee?.lastName}
                              </p>
                              <p className="text-amber-600 dark:text-amber-500">
                                {formatDate(delegation.startDate)}
                                {delegation.endDate ? ` - ${formatDate(delegation.endDate)}` : ''}
                              </p>
                            </div>
                            <button
                              onClick={() => revokeDelegationMutation.mutate(delegation.id)}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              title="Revocar"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <UserCircleIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Selecciona un empleado del organigrama
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Create Delegation Modal */}
        {showDelegationModal && selectedNode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Crear Delegacion</h3>
                <button
                  onClick={() => setShowDelegationModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>{selectedNode.fullName}</strong> delegara sus autorizaciones
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delegar a *</label>
                  <select
                    value={delegationForm.delegateeId}
                    onChange={(e) => setDelegationForm({ ...delegationForm, delegateeId: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">Seleccionar empleado...</option>
                    {employees
                      .filter((emp: any) => emp.id !== selectedNode.id)
                      .map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de delegacion *</label>
                  <select
                    value={delegationForm.delegationType}
                    onChange={(e) => setDelegationForm({ ...delegationForm, delegationType: e.target.value })}
                    className="input w-full"
                  >
                    {DELEGATION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha inicio *</label>
                    <input
                      type="date"
                      value={delegationForm.startDate}
                      onChange={(e) => setDelegationForm({ ...delegationForm, startDate: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha fin</label>
                    <input
                      type="date"
                      value={delegationForm.endDate}
                      onChange={(e) => setDelegationForm({ ...delegationForm, endDate: e.target.value })}
                      min={delegationForm.startDate}
                      className="input w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo (opcional)</label>
                  <textarea
                    value={delegationForm.reason}
                    onChange={(e) => setDelegationForm({ ...delegationForm, reason: e.target.value })}
                    placeholder="Ej: Vacaciones, Incapacidad..."
                    rows={2}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t dark:border-gray-700">
                <button onClick={() => setShowDelegationModal(false)} className="btn-secondary">Cancelar</button>
                <button
                  onClick={handleCreateDelegation}
                  disabled={!delegationForm.delegateeId || createDelegationMutation.isPending}
                  className="btn-primary"
                >
                  {createDelegationMutation.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeNode && <DragOverlayCard node={activeNode} level={activeNode.level} />}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
