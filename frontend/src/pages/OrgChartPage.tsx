import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UsersIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ArrowPathIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { hierarchyApi, catalogsApi, employeesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
  delegatee?: { firstName: string; lastName: string };
}

const DELEGATION_TYPES = [
  { value: 'ALL', label: 'Todas las autorizaciones' },
  { value: 'VACATION', label: 'Vacaciones' },
  { value: 'PERMISSION', label: 'Permisos' },
  { value: 'INCIDENT', label: 'Incidencias' },
];

interface OrgNodeProps {
  node: HierarchyNode;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  searchTerm: string;
  selectedId: string | null;
  onSelect: (node: HierarchyNode) => void;
  level: number;
}

function OrgNode({ node, expandedNodes, toggleNode, searchTerm, selectedId, onSelect, level }: OrgNodeProps) {
  const isExpanded = expandedNodes.has(node.id);
  const hasSubordinates = node.subordinates.length > 0;
  const isSelected = selectedId === node.id;

  // Check if node matches search
  const matchesSearch = searchTerm
    ? node.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.jobPosition.toLowerCase().includes(searchTerm.toLowerCase())
    : true;

  // Check if any descendant matches search
  const hasMatchingDescendant = (n: HierarchyNode): boolean => {
    if (searchTerm) {
      const matches =
        n.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.jobPosition.toLowerCase().includes(searchTerm.toLowerCase());
      if (matches) return true;
      return n.subordinates.some(hasMatchingDescendant);
    }
    return true;
  };

  const showNode = matchesSearch || hasMatchingDescendant(node);

  if (!showNode) return null;

  const levelColors = [
    'border-l-blue-500',
    'border-l-green-500',
    'border-l-purple-500',
    'border-l-orange-500',
    'border-l-pink-500',
    'border-l-cyan-500',
  ];

  const borderColor = levelColors[level % levelColors.length];

  return (
    <div className="ml-4">
      <div
        className={`flex items-center gap-2 p-2 rounded-lg border-l-4 ${borderColor} cursor-pointer transition-all ${
          isSelected
            ? 'bg-primary-100 dark:bg-primary-900/30'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        onClick={() => onSelect(node)}
      >
        {hasSubordinates && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleNode(node.id);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
        )}
        {!hasSubordinates && <div className="w-6" />}

        <UserCircleIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm truncate ${matchesSearch && searchTerm ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
            {node.fullName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {node.jobPosition}
          </p>
        </div>

        {hasSubordinates && (
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            <UsersIcon className="h-3 w-3" />
            {node.subordinates.length}
          </span>
        )}
      </div>

      {isExpanded && hasSubordinates && (
        <div className="ml-3 mt-1 space-y-1">
          {node.subordinates.map((sub) => (
            <OrgNode
              key={sub.id}
              node={sub}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              searchTerm={searchTerm}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [delegationForm, setDelegationForm] = useState({
    delegateeId: '',
    delegationType: 'ALL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    reason: '',
  });

  // Get companies
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
  });

  const companies = companiesData?.data || [];

  // Get org chart
  const { data: orgChartData, isLoading } = useQuery({
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

  // Toggle node expansion
  const toggleNode = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Expand all nodes
  const expandAll = useCallback(() => {
    const getAllIds = (nodes: HierarchyNode[]): string[] => {
      return nodes.flatMap((n) => [n.id, ...getAllIds(n.subordinates)]);
    };
    setExpandedNodes(new Set(getAllIds(orgChart)));
  }, [orgChart]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // Count total employees
  const countEmployees = (nodes: HierarchyNode[]): number => {
    return nodes.reduce((acc, n) => acc + 1 + countEmployees(n.subordinates), 0);
  };

  const totalEmployees = countEmployees(orgChart);

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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Organigrama</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Estructura jerárquica de la organización
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Org Chart */}
        <div className="lg:col-span-2 card dark:bg-gray-800">
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
              <button
                onClick={expandAll}
                className="btn-secondary text-xs py-1.5 px-3"
                title="Expandir todo"
              >
                <ArrowsPointingOutIcon className="h-4 w-4" />
              </button>
              <button
                onClick={collapseAll}
                className="btn-secondary text-xs py-1.5 px-3"
                title="Colapsar todo"
              >
                <ArrowsPointingInIcon className="h-4 w-4" />
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
          </div>

          {/* Tree */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
          ) : orgChart.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No hay estructura jerárquica definida
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Asigna supervisores a los empleados para crear el organigrama
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {orgChart.map((node) => (
                <OrgNode
                  key={node.id}
                  node={node}
                  expandedNodes={expandedNodes}
                  toggleNode={toggleNode}
                  searchTerm={searchTerm}
                  selectedId={selectedNode?.id || null}
                  onSelect={setSelectedNode}
                  level={0}
                />
              ))}
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div className="card dark:bg-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Detalles del Empleado
          </h2>

          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <UserCircleIcon className="h-16 w-16 text-gray-400" />
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Puesto
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedNode.jobPosition || 'No asignado'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Departamento
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedNode.department || 'No asignado'}
                  </p>
                </div>

                {selectedNode.email && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Correo
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedNode.email}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nivel jerárquico
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Nivel {selectedNode.level}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Subordinados directos
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedNode.subordinates.length} personas
                  </p>
                </div>
              </div>

              {selectedNode.subordinates.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Equipo directo
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedNode.subordinates.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => setSelectedNode(sub)}
                      >
                        <UserCircleIcon className="h-6 w-6 text-gray-400" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {sub.fullName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {sub.jobPosition}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delegations Section */}
              <div className="border-t dark:border-gray-700 pt-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Delegaciones de autorización
                  </p>
                  <button
                    onClick={() => setShowDelegationModal(true)}
                    className="p-1 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                    title="Crear delegación"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>

                {loadingDelegations ? (
                  <div className="flex justify-center py-2">
                    <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />
                  </div>
                ) : delegations.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                    Sin delegaciones activas
                  </p>
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
                              Delegado a: {delegation.delegatee?.firstName} {delegation.delegatee?.lastName}
                            </p>
                            <p className="text-amber-600 dark:text-amber-500">
                              {formatDate(delegation.startDate)}
                              {delegation.endDate ? ` - ${formatDate(delegation.endDate)}` : ' (sin fecha fin)'}
                            </p>
                          </div>
                          <button
                            onClick={() => revokeDelegationMutation.mutate(delegation.id)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title="Revocar delegación"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                        {delegation.reason && (
                          <p className="text-amber-600 dark:text-amber-500 mt-1 italic">
                            "{delegation.reason}"
                          </p>
                        )}
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
                Selecciona un empleado para ver sus detalles
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
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Crear Delegación de Autorización
              </h3>
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
                  <strong>{selectedNode.fullName}</strong> delegará sus autorizaciones
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Delegar a *
                </label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de delegación *
                </label>
                <select
                  value={delegationForm.delegationType}
                  onChange={(e) => setDelegationForm({ ...delegationForm, delegationType: e.target.value })}
                  className="input w-full"
                >
                  {DELEGATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha inicio *
                  </label>
                  <input
                    type="date"
                    value={delegationForm.startDate}
                    onChange={(e) => setDelegationForm({ ...delegationForm, startDate: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha fin
                  </label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Motivo (opcional)
                </label>
                <textarea
                  value={delegationForm.reason}
                  onChange={(e) => setDelegationForm({ ...delegationForm, reason: e.target.value })}
                  placeholder="Ej: Vacaciones, Incapacidad, Viaje de trabajo..."
                  rows={2}
                  className="input w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t dark:border-gray-700">
              <button
                onClick={() => setShowDelegationModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateDelegation}
                disabled={!delegationForm.delegateeId || createDelegationMutation.isPending}
                className="btn-primary"
              >
                {createDelegationMutation.isPending ? 'Creando...' : 'Crear Delegación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
