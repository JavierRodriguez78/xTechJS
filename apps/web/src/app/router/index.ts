import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { customerSession } from "../../features/customer-portal/session";
import { staffSession } from "../../features/auth/session";

declare module "vue-router" {
  interface RouteMeta { permission?: "customers:read" | "customers:manage" | "repairs:read" | "repairs:manage" | "inventory:manage" | "payments:manage" | "users:manage"; customer?: boolean }
}

const routes: RouteRecordRaw[] = [
  { path: "/login", name: "staff.login", component: () => import("../../features/auth/StaffLogin.vue") },
  { path: "/customer/register", name: "customer.register", component: () => import("../../features/customer-portal/CustomerRegistration.vue") },
  { path: "/customer/login", name: "customer.login", component: () => import("../../features/customer-portal/CustomerLogin.vue") },
  { path: "/customer", component: () => import("../layouts/CustomerLayout.vue"), children: [{ path: "", name: "customer.portal", component: () => import("../../features/customer-portal/CustomerPortal.vue"), meta: { customer: true } }] },
  {
    path: "/", component: () => import("../layouts/AppLayout.vue"), children: [
      { path: "", redirect: { name: "customers.list" } },
      { path: "clientes", name: "customers.list", component: () => import("../../features/customers/views/CustomerListView.vue"), meta: { permission: "customers:read" } },
      { path: "clientes/nuevo", name: "customers.create", component: () => import("../../features/customers/views/CustomerCreateView.vue"), meta: { permission: "customers:manage" } },
      { path: "clientes/:id/editar", name: "customers.edit", component: () => import("../../features/customers/views/CustomerEditView.vue"), meta: { permission: "customers:manage" } },
      { path: "clientes/:id", component: () => import("../../features/customers/views/CustomerDetailView.vue"), meta: { permission: "customers:read" }, redirect: { name: "customers.detail.general" }, children: [
        { path: "general", name: "customers.detail.general", component: () => import("../../features/customers/views/tabs/CustomerGeneralTab.vue") },
        { path: "facturacion", name: "customers.detail.billing", component: () => import("../../features/customers/views/tabs/CustomerBillingTab.vue") },
        { path: "reparaciones", name: "customers.detail.repairs", component: () => import("../../features/customers/views/tabs/CustomerRepairsTab.vue") },
        { path: "notas", name: "customers.detail.notes", component: () => import("../../features/customers/views/tabs/CustomerNotesTab.vue") }
      ] },
      { path: "reparaciones", name: "repairs.list", component: () => import("../../features/repairs/views/RepairListView.vue"), meta: { permission: "repairs:read" } },
      { path: "reparaciones/nueva", name: "repairs.create", component: () => import("../../features/repairs/views/RepairCreateView.vue"), meta: { permission: "repairs:manage" } },
      { path: "reparaciones/:id", component: () => import("../../features/repairs/views/RepairDetailView.vue"), meta: { permission: "repairs:read" }, redirect: { name: "repairs.detail.general" }, children: [
        { path: "general", name: "repairs.detail.general", component: () => import("../../features/repairs/views/tabs/RepairGeneralTab.vue") },
        { path: "diagnostico", name: "repairs.detail.technical", component: () => import("../../features/repairs/views/tabs/RepairTechnicalTab.vue"), meta: { permission: "repairs:manage" } },
        { path: "presupuesto", name: "repairs.detail.quote", component: () => import("../../features/repairs/views/tabs/RepairQuoteTab.vue"), meta: { permission: "repairs:manage" } },
        { path: "materiales", name: "repairs.detail.materials", component: () => import("../../features/repairs/views/tabs/RepairMaterialsTab.vue"), meta: { permission: "inventory:manage" } },
        { path: "historial", name: "repairs.detail.history", component: () => import("../../features/repairs/views/tabs/RepairHistoryTab.vue") },
        { path: "cobros", name: "repairs.detail.payments", component: () => import("../../features/repairs/views/tabs/RepairPaymentsTab.vue"), meta: { permission: "payments:manage" } }
      ] },
      { path: "almacen", name: "inventory.list", component: () => import("../../features/inventory/views/InventoryListView.vue"), meta: { permission: "inventory:manage" } },
      { path: "almacen/nuevo", name: "inventory.create", component: () => import("../../features/inventory/views/InventoryCreateView.vue"), meta: { permission: "inventory:manage" } },
      { path: "almacen/alertas", name: "inventory.alerts", component: () => import("../../features/inventory/views/LowStockView.vue"), meta: { permission: "inventory:manage" } },
      { path: "almacen/proveedores", name: "suppliers.list", component: () => import("../../features/inventory/views/SupplierListView.vue"), meta: { permission: "inventory:manage" } },
      { path: "almacen/ordenes-compra", name: "purchase-orders.list", component: () => import("../../features/inventory/views/PurchaseOrderListView.vue"), meta: { permission: "inventory:manage" } },
      { path: "almacen/:id", component: () => import("../../features/inventory/views/InventoryDetailView.vue"), meta: { permission: "inventory:manage" }, redirect: { name: "inventory.detail.general" }, children: [
        { path: "general", name: "inventory.detail.general", component: () => import("../../features/inventory/views/tabs/InventoryGeneralTab.vue") },
        { path: "movimientos", name: "inventory.detail.movements", component: () => import("../../features/inventory/views/tabs/InventoryMovementsTab.vue") }
      ] },
      { path: "tpv", name: "payments.list", component: () => import("../../features/payments/views/PaymentListView.vue"), meta: { permission: "payments:manage" } },
      { path: "tpv/nuevo", name: "payments.create", component: () => import("../../features/payments/views/PaymentCreateView.vue"), meta: { permission: "payments:manage" } },
      { path: "tpv/caja", name: "payments.cash-register", component: () => import("../../features/payments/views/CashRegisterView.vue"), meta: { permission: "payments:manage" } },
      { path: "tpv/informes", name: "payments.reports", component: () => import("../../features/payments/views/PaymentReportView.vue"), meta: { permission: "payments:manage" } },
      { path: "tpv/:id", name: "payments.detail", component: () => import("../../features/payments/views/PaymentDetailView.vue"), meta: { permission: "payments:manage" } },
      { path: "admin/usuarios", name: "admin.users.list", component: () => import("../../features/admin/views/UserListView.vue"), meta: { permission: "users:manage" } },
      { path: "admin/usuarios/nuevo", name: "admin.users.create", component: () => import("../../features/admin/views/UserCreateView.vue"), meta: { permission: "users:manage" } },
      { path: "admin/usuarios/:id/editar", name: "admin.users.edit", component: () => import("../../features/admin/views/UserEditView.vue"), meta: { permission: "users:manage" } },
      { path: "admin/auditoria", name: "admin.audit.list", component: () => import("../../features/admin/views/AuditLogView.vue"), meta: { permission: "users:manage" } },
      { path: "admin/configuracion/estados", name: "admin.config.statuses", component: () => import("../../features/admin/views/AdminStatusConfigView.vue"), meta: { permission: "users:manage" } },
      { path: "admin/configuracion/dispositivos", name: "admin.config.devices", component: () => import("../../features/admin/views/AdminDeviceConfigView.vue"), meta: { permission: "users:manage" } },
      { path: "admin/usuarios/:id", component: () => import("../../features/admin/views/UserDetailView.vue"), meta: { permission: "users:manage" }, redirect: { name: "admin.users.detail.general" }, children: [
        { path: "general", name: "admin.users.detail.general", component: () => import("../../features/admin/views/tabs/UserGeneralTab.vue") },
        { path: "permisos", name: "admin.users.detail.permissions", component: () => import("../../features/admin/views/tabs/UserPermissionsTab.vue") }
      ] }
    ]
  }
];

const router = createRouter({ history: createWebHistory(), routes });
router.beforeEach((to) => {
  if (to.meta.customer) return customerSession.value ? true : { name: "customer.login" };
  if (to.name === "staff.login" && staffSession.value) return { name: "customers.list" };
  if (to.name === "customer.login" && customerSession.value) return { name: "customer.portal" };
  if (!to.meta.permission) return true;
  if (!staffSession.value) return { name: "staff.login", query: { redirect: to.fullPath } };
  const role = staffSession.value.user.role;
  const canManage = role === "admin";
  if (to.meta.permission === "users:manage" && !canManage) return { name: "customers.list" };
  const isReadPermission = to.meta.permission.endsWith(":read");
  const canAccess = canManage || (role === "technician" && (to.meta.permission === "customers:read" || to.meta.permission === "repairs:read" || to.meta.permission === "repairs:manage"));
  return isReadPermission || canAccess ? true : { name: "customers.list" };
});
export default router;