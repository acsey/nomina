import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UserCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UsersIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/outline';
import { hierarchyApi, catalogsApi } from '../services/api';
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
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);

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
    </div>
  );
}
