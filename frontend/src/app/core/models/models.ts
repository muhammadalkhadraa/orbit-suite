export type TenantRole = 'Owner' | 'Admin' | 'Manager' | 'Employee';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role?: TenantRole;
  departmentCode?: string; // 'HR', 'FIN', 'IT', etc.
  departmentName?: string;
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  role: TenantRole;
}

export interface TenantMembershipSummary {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: TenantRole;
  status: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInMinutes: number;
  user: UserProfile;
  activeTenant: TenantSummary;
  availableTenants: TenantMembershipSummary[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PagedResponse<T> {
  success: boolean;
  data: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface TenantDetails {
  id: string;
  name: string;
  slug: string;
  status: string;
  industry?: string;
  timeZoneId?: string;
  currencyCode?: string;
  branchCount: number;
  departmentCount: number;
  employeeCount: number;
  createdAtUtc: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  isActive: boolean;
  employeeCount: number;
}

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  employeeCount: number;
}

export interface Employee {
  id: string;
  tenantId?: string;
  userId?: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  jobTitle: string;
  branchId?: string;
  branchName?: string;
  departmentId?: string;
  departmentName?: string;
  reportsToEmployeeId?: string;
  reportsToName?: string;
  isActive: boolean;
  hireDateUtc?: string;
  baseSalary?: number;
  baseMonthlySalary?: number;
  dailyRate?: number;
  hourlyRate?: number;
  overtimeRate?: number;
  contractType?: string;
  contractStartDateUtc?: string;
  contractEndDateUtc?: string;
  contractNotes?: string;
  vacationDaysAllocated?: number;
  vacationDaysUsed?: number;
  vacationDaysRemaining?: number;
  createLoginAccount?: boolean;
  initialPassword?: string;
}

export type TaskStatus = 'Todo' | 'InProgress' | 'InReview' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface TaskItem {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  createdByEmployeeId?: string;
  createdByEmployeeName?: string;
  departmentId?: string;
  departmentName?: string;
  dueDateUtc?: string;
  completedAtUtc?: string;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export type CustomerStatus = 'Lead' | 'Prospect' | 'ActiveCustomer' | 'Inactive';

export interface Customer {
  id: string;
  tenantId: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  status: CustomerStatus;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  notes?: string;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface CreateCustomerRequest {
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  status?: CustomerStatus;
  assignedEmployeeId?: string;
  notes?: string;
}

export type DealStage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'ClosedWon' | 'ClosedLost';

export interface Deal {
  id: string;
  tenantId: string;
  title: string;
  customerId: string;
  customerName: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  amount: number;
  currency: string;
  stage: DealStage;
  stageName: string;
  probability: number;
  expectedCloseDateUtc?: string;
  closedAtUtc?: string;
  lostReason?: string;
  notes?: string;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface CreateDealRequest {
  title: string;
  customerId: string;
  assignedEmployeeId?: string;
  amount: number;
  currency?: string;
  stage?: DealStage;
  probability?: number;
  expectedCloseDateUtc?: string;
  notes?: string;
}

export interface UpdateDealRequest {
  title: string;
  customerId: string;
  assignedEmployeeId?: string;
  amount: number;
  currency?: string;
  stage: DealStage;
  probability: number;
  expectedCloseDateUtc?: string;
  lostReason?: string;
  notes?: string;
}

export interface UpdateDealStageRequest {
  stage: DealStage;
  probability?: number;
  lostReason?: string;
}

export interface DealMetrics {
  totalPipelineValue: number;
  weightedPipelineValue: number;
  wonValue: number;
  lostValue: number;
  openDealsCount: number;
  wonDealsCount: number;
  lostDealsCount: number;
  totalDealsCount: number;
  winRatePercentage: number;
}

export type TicketStatus = 'Open' | 'Pending' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TicketCategory = 'Technical' | 'Billing' | 'Product' | 'Account' | 'General' | 'Hardware' | 'Software' | 'NetworkAccess' | 'ErpSystem';

export interface TicketComment {
  id: string;
  ticketId: string;
  authorEmployeeId?: string;
  authorName: string;
  commentText: string;
  isInternal: boolean;
  createdAtUtc: string;
}

export interface SupportTicket {
  id: string;
  tenantId: string;
  ticketNumber: string;
  subject: string;
  description: string;
  customerId?: string;
  customerName?: string;
  isInternalItTicket?: boolean;
  requestingEmployeeId?: string;
  requestingEmployeeName?: string;
  targetDepartmentId?: string;
  targetDepartmentName?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  createdByEmployeeId?: string;
  createdByEmployeeName?: string;
  status: TicketStatus;
  statusName: string;
  priority: TicketPriority;
  priorityName: string;
  category: TicketCategory;
  categoryName: string;
  resolvedAtUtc?: string;
  closedAtUtc?: string;
  resolutionSummary?: string;
  commentsCount: number;
  comments: TicketComment[];
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface CreateTicketRequest {
  subject: string;
  description: string;
  customerId?: string;
  isInternalItTicket?: boolean;
  requestingEmployeeId?: string;
  targetDepartmentId?: string;
  assignedEmployeeId?: string;
  priority: TicketPriority;
  category: TicketCategory;
}

export interface UpdateTicketRequest {
  subject: string;
  description: string;
  customerId?: string;
  isInternalItTicket?: boolean;
  requestingEmployeeId?: string;
  targetDepartmentId?: string;
  assignedEmployeeId?: string;
  priority: TicketPriority;
  category: TicketCategory;
  status: TicketStatus;
  resolutionSummary?: string;
}

export interface UpdateTicketStatusRequest {
  status: TicketStatus;
  resolutionSummary?: string;
}

export interface AddTicketCommentRequest {
  commentText: string;
  isInternal: boolean;
}

export interface TicketMetrics {
  openTicketsCount: number;
  pendingTicketsCount: number;
  resolvedTicketsCount: number;
  closedTicketsCount: number;
  urgentTicketsCount: number;
  totalTicketsCount: number;
  resolutionRatePercentage: number;
}

export type ProductCategory =
  | 'Hardware'
  | 'Software'
  | 'Electronics'
  | 'RawMaterials'
  | 'Components'
  | 'FinishedGoods'
  | 'Services';

export type StockMovementType =
  | 'Receipt'
  | 'AdjustmentIn'
  | 'AdjustmentOut'
  | 'Transfer'
  | 'SaleShipment'
  | 'Scrap';

export interface ProductInventory {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  aisleBinLocation?: string;
  isLowStock: boolean;
}

export interface Product {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  description?: string;
  category: ProductCategory;
  categoryName: string;
  unitOfMeasure: string;
  unitPrice: number;
  unitCost: number;
  reorderLevel: number;
  isActive: boolean;
  totalQuantityOnHand: number;
  totalQuantityReserved: number;
  totalQuantityAvailable: number;
  isLowStock: boolean;
  inventoryValuation: number;
  branchInventories: ProductInventory[];
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  branchId: string;
  branchName: string;
  destinationBranchId?: string;
  destinationBranchName?: string;
  type: StockMovementType;
  typeName: string;
  quantity: number;
  unitCost?: number;
  totalCost: number;
  referenceNumber?: string;
  reason?: string;
  performedByEmployeeId?: string;
  performedByEmployeeName?: string;
  timestampUtc: string;
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  description?: string;
  category: ProductCategory;
  unitOfMeasure: string;
  unitPrice: number;
  unitCost: number;
  reorderLevel: number;
  initialBranchId?: string;
  initialQuantity?: number;
  aisleBinLocation?: string;
}

export interface UpdateProductRequest {
  name: string;
  description?: string;
  category: ProductCategory;
  unitOfMeasure: string;
  unitPrice: number;
  unitCost: number;
  reorderLevel: number;
  isActive: boolean;
}

export interface AdjustStockRequest {
  productId: string;
  branchId: string;
  type: StockMovementType;
  quantity: number;
  destinationBranchId?: string;
  unitCost?: number;
  referenceNumber?: string;
  reason?: string;
  aisleBinLocation?: string;
}

export interface InventoryMetrics {
  totalProductsCount: number;
  activeProductsCount: number;
  lowStockProductsCount: number;
  outOfStockProductsCount: number;
  totalInventoryValuation: number;
  totalUnitsOnHand: number;
  recentMovementsCount: number;
}

export type InvoiceStatus = 'Draft' | 'Issued' | 'PartiallyPaid' | 'Paid' | 'Overdue' | 'Void';
export type PaymentMethod = 'BankTransfer' | 'CreditCard' | 'Check' | 'Cash' | 'Electronic';

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId?: string;
  productSku?: string;
  productName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  totalAmount: number;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  paymentNumber: string;
  amount: number;
  paymentDateUtc: string;
  method: PaymentMethod;
  methodName: string;
  referenceNumber?: string;
  notes?: string;
  recordedByEmployeeId?: string;
  recordedByEmployeeName?: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  dealId?: string;
  dealTitle?: string;
  issueDateUtc: string;
  dueDateUtc: string;
  paidAtUtc?: string;
  status: InvoiceStatus;
  statusName: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  isOverdue: boolean;
  notes?: string;
  termsAndConditions?: string;
  items: InvoiceItem[];
  payments: PaymentRecord[];
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface CreateInvoiceItemRequest {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceRequest {
  customerId: string;
  dealId?: string;
  issueDateUtc?: string;
  dueDateUtc?: string;
  currency?: string;
  taxRate: number;
  discountAmount: number;
  notes?: string;
  termsAndConditions?: string;
  items: CreateInvoiceItemRequest[];
}

export interface UpdateInvoiceRequest {
  customerId: string;
  dealId?: string;
  dueDateUtc: string;
  taxRate: number;
  discountAmount: number;
  notes?: string;
  termsAndConditions?: string;
  items: CreateInvoiceItemRequest[];
}

export interface RecordPaymentRequest {
  amount: number;
  method: PaymentMethod;
  paymentDateUtc?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface FinancialMetrics {
  totalInvoicedAmount: number;
  totalCollectedAmount: number;
  totalOutstandingAmount: number;
  totalOverdueAmount: number;
  totalInvoicesCount: number;
  draftInvoicesCount: number;
  issuedInvoicesCount: number;
  partiallyPaidInvoicesCount: number;
  paidInvoicesCount: number;
  collectionRatePercentage: number;
}

// ==========================================
// 11. MANUFACTURING & WORK ORDERS
// ==========================================
export type WorkOrderStatus = 'Draft' | 'Planned' | 'InProgress' | 'Completed' | 'Cancelled';
export type WorkOrderPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface WorkOrder {
  id: string;
  tenantId: string;
  orderNumber: string;
  productId: string;
  productSku: string;
  productName: string;
  billOfMaterialsId?: string;
  bomNumber?: string;
  bomName?: string;
  branchId: string;
  branchName: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  quantityTarget: number;
  quantityProduced: number;
  progressPercentage: number;
  status: WorkOrderStatus;
  statusName: string;
  priority: WorkOrderPriority;
  priorityName: string;
  startDateUtc?: string;
  dueDateUtc?: string;
  completedDateUtc?: string;
  isOverdue: boolean;
  notes?: string;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface BillOfMaterials {
  id: string;
  tenantId: string;
  bomNumber: string;
  name: string;
  description?: string;
  productId: string;
  productSku: string;
  productName: string;
  version: string;
  isActive: boolean;
  items: BomItem[];
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface BomItem {
  id: string;
  billOfMaterialsId: string;
  componentProductId: string;
  componentProductSku: string;
  componentProductName: string;
  quantityRequired: number;
  unitOfMeasure: string;
  notes?: string;
}

export interface CreateWorkOrderRequest {
  productId: string;
  billOfMaterialsId?: string;
  branchId: string;
  assignedEmployeeId?: string;
  quantityTarget: number;
  priority: WorkOrderPriority;
  startDateUtc?: string;
  dueDateUtc?: string;
  notes?: string;
}

export interface UpdateWorkOrderRequest {
  branchId: string;
  assignedEmployeeId?: string;
  quantityTarget: number;
  priority: WorkOrderPriority;
  startDateUtc?: string;
  dueDateUtc?: string;
  notes?: string;
}

export interface UpdateWorkOrderStatusRequest {
  status: WorkOrderStatus;
  quantityProduced?: number;
  notes?: string;
}

export interface CreateBomRequest {
  productId: string;
  name: string;
  description?: string;
  version: string;
  items: CreateBomItemRequest[];
}

export interface CreateBomItemRequest {
  componentProductId: string;
  quantityRequired: number;
  unitOfMeasure: string;
  notes?: string;
}

export interface ManufacturingMetrics {
  totalWorkOrders: number;
  draftCount: number;
  plannedCount: number;
  inProgressCount: number;
  completedCount: number;
  cancelledCount: number;
  totalUnitsTarget: number;
  totalUnitsProduced: number;
  completionRate: number;
}

// ==========================================
// 12. HR & ATTENDANCE MANAGEMENT
// ==========================================
export type LeaveType = 'Annual' | 'Sick' | 'Unpaid' | 'MaternityPaternity' | 'Bereavement' | 'Compensatory';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export type AttendanceStatus = 'Present' | 'Late' | 'HalfDay' | 'Absent' | 'OnLeave';
export type ShiftType = 'StandardDay' | 'MorningShift' | 'EveningShift' | 'NightShift' | 'Flexible';

export interface LeaveRequest {
  id: string;
  requestNumber: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string;
  leaveType: LeaveType;
  startDateUtc: string;
  endDateUtc: string;
  daysCount: number;
  reason: string;
  status: LeaveStatus;
  approverEmployeeId?: string;
  approverEmployeeName?: string;
  actionedAtUtc?: string;
  rejectionReason?: string;
  remainingBalanceAtRequest?: number;
  resultingBalanceAfterApproval?: number;
  isForwardedToHr?: boolean;
  forwardedToHrAtUtc?: string;
  currentEmployeeBalance?: number;
  employeeAllocatedDays?: number;
  employeeUsedDays?: number;
  createdAtUtc: string;
}

export interface EmployeeVacationBalance {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string;
  allocatedDays: number;
  usedDays: number;
  remainingDays: number;
  isDeficit: boolean;
}

export interface CreateLeaveRequestRequest {
  employeeId?: string;
  leaveType: LeaveType;
  startDateUtc: string;
  endDateUtc: string;
  daysCount?: number;
  reason: string;
}

export interface ActionLeaveRequestRequest {
  status: LeaveStatus;
  rejectionReason?: string;
}

export interface LeaveRequestFilter {
  status?: LeaveStatus;
  leaveType?: LeaveType;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string;
  date: string;
  checkInTimeUtc?: string;
  checkOutTimeUtc?: string;
  totalHours?: number;
  status: AttendanceStatus;
  workLocation: string;
  notes?: string;
  createdAtUtc: string;
}

export interface CheckInRequest {
  workLocation?: string;
  notes?: string;
}

export interface CheckOutRequest {
  notes?: string;
}

export interface RecordAttendanceRequest {
  employeeId: string;
  date: string;
  checkInTimeUtc?: string;
  checkOutTimeUtc?: string;
  status: AttendanceStatus;
  workLocation?: string;
  notes?: string;
}

export interface AttendanceFilter {
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: AttendanceStatus;
  page?: number;
  pageSize?: number;
}

export interface ShiftSchedule {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  shiftName: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  effectiveFromUtc: string;
  effectiveToUtc?: string;
  isActive: boolean;
  notes?: string;
  createdAtUtc: string;
}

export interface CreateShiftScheduleRequest {
  employeeId: string;
  shiftName: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  effectiveFromUtc: string;
  effectiveToUtc?: string;
  notes?: string;
}

export interface UpdateShiftScheduleRequest {
  shiftName: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  effectiveFromUtc: string;
  effectiveToUtc?: string;
  isActive: boolean;
  notes?: string;
}

export interface HrMetrics {
  totalEmployees: number;
  presentToday: number;
  attendanceRatePercent: number;
  onLeaveToday: number;
  lateToday: number;
  pendingLeaveRequests: number;
  approvedLeaveDaysThisMonth: number;
}

// ==========================================
// 13. EXECUTIVE REPORTS & ANALYTICS
// ==========================================
export type ReportType = 'FinancialSummary' | 'SalesPipeline' | 'InventoryValuation' | 'SupportSla' | 'WorkforceAttendance';
export type ExportFormat = 'Csv' | 'Json';

export interface ExecutiveFinancialSummary {
  totalInvoiced: number;
  totalCollected: number;
  outstandingAr: number;
  overdueAr: number;
  collectionRate: number;
  invoiceCount: number;
}

export interface ExecutiveSalesSummary {
  totalPipelineValue: number;
  weightedPipelineValue: number;
  wonRevenue: number;
  winRatePercent: number;
  activeDealsCount: number;
}

export interface ExecutiveSupportSummary {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  urgentTickets: number;
  resolutionRatePercent: number;
}

export interface ExecutiveInventorySummary {
  totalValuation: number;
  totalSkus: number;
  totalUnitsOnHand: number;
  lowStockCount: number;
}

export interface ExecutiveManufacturingSummary {
  totalWorkOrders: number;
  activeWorkOrders: number;
  completedWorkOrders: number;
  totalUnitsTarget: number;
  totalUnitsProduced: number;
  productionYieldRatePercent: number;
}

export interface ExecutiveWorkforceSummary {
  totalEmployees: number;
  presentToday: number;
  attendanceRatePercent: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
}

export interface MonthlyTrendItem {
  month: string;
  invoiced: number;
  collected: number;
}

export interface PipelineFunnelItem {
  stage: string;
  count: number;
  totalAmount: number;
}

export interface CategoryDistributionItem {
  category: string;
  value: number;
  count: number;
}

export interface ExecutiveDashboard {
  financial: ExecutiveFinancialSummary;
  sales: ExecutiveSalesSummary;
  support: ExecutiveSupportSummary;
  inventory: ExecutiveInventorySummary;
  manufacturing: ExecutiveManufacturingSummary;
  workforce: ExecutiveWorkforceSummary;
  revenueTrend: MonthlyTrendItem[];
  pipelineFunnel: PipelineFunnelItem[];
  departmentDistribution: CategoryDistributionItem[];
  inventoryDistribution: CategoryDistributionItem[];
}

export interface ReportExportRequest {
  reportType: ReportType;
  format: ExportFormat;
  startDate?: string;
  endDate?: string;
}

export interface ReportExport {
  id: string;
  title: string;
  reportType: ReportType;
  format: ExportFormat;
  fileName: string;
  mimeType: string;
  content: string;
  recordCount: number;
  fileSizeKb: number;
  generatedAtUtc: string;
}

export interface ReportExportHistory {
  id: string;
  reportType: ReportType;
  title: string;
  format: ExportFormat;
  generatedByEmployeeName?: string;
  recordCount: number;
  fileSizeKb: number;
  createdAtUtc: string;
}

// ==========================================
// SECTION 14: System Audit Trail
// ==========================================

export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  userEmail?: string;
  action: string;
  entityName: string;
  entityId?: string;
  detailsJson?: string;
  ipAddress?: string;
  timestampUtc: string;
}

export interface AuditLogFilter {
  search?: string;
  entityName?: string;
  action?: string;
  userId?: string;
  userEmail?: string;
  fromDateUtc?: string;
  toDateUtc?: string;
  pageNumber?: number;
  pageSize?: number;
}

// ==========================================
// SECTION 15: Activity & Time Tracking
// ==========================================

export type ActivityState = 'NotStarted' | 'Working' | 'OnBreak' | 'Closed' | 'Idle';

export interface ActivityActionRequest {
  employeeCode: string;
  password?: string;
  action: 'Start' | 'Break' | 'Resume' | 'End' | 'pause-idle' | 'resume-idle' | string;
  clientLocalHour?: number;
  clientLocalMinute?: number;
  notes?: string;
}

export interface UserActivityStatusDto {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  departmentName: string;
  jobTitle: string;
  date: string;
  state: ActivityState;
  workStartedAtUtc?: string;
  workEndedAtUtc?: string;
  currentBreakStartedAtUtc?: string;
  lastWorkResumedAtUtc?: string;
  totalWorkSeconds: number;
  totalBreakSeconds: number;
  currentWorkSeconds: number;
  currentBreakSeconds: number;
  isLate: boolean;
  lateMinutes: number;
  faultsCount: number;
  faultReason?: string;
  breakSecondsRemaining: number;
  hasExceededBreak: boolean;
  serverTimeUtc: string;
}

export interface LiveEmployeeActivityDto {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  email: string;
  departmentName: string;
  jobTitle: string;
  branchName: string;
  date: string;
  state: ActivityState;
  workStartedAtUtc?: string;
  workEndedAtUtc?: string;
  currentBreakStartedAtUtc?: string;
  totalWorkSeconds: number;
  totalBreakSeconds: number;
  currentWorkSeconds: number;
  currentBreakSeconds: number;
  isLate: boolean;
  lateMinutes: number;
  faultsCount: number;
  faultReason?: string;
  breakExceeded: boolean;
  breakRemainingSeconds: number;
}

export interface LiveMonitorResponse {
  totalEmployees: number;
  workingCount: number;
  idleCount?: number;
  onBreakCount: number;
  closedCount: number;
  notStartedCount: number;
  lateTodayCount: number;
  faultsTodayCount: number;
  employees: LiveEmployeeActivityDto[];
  serverTimeUtc: string;
}

export interface ActivityReportFilter {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
  employeeId?: string;
  state?: ActivityState;
  lateOnly?: boolean;
  faultsOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ActivityReportResponse {
  totalRecords: number;
  totalWorkHours: number;
  totalBreakHours: number;
  totalLateCount: number;
  totalFaultsCount: number;
  averageWorkHoursPerDay: number;
  records: LiveEmployeeActivityDto[];
  page: number;
  pageSize: number;
}

// ==========================================
// 14. COMPLIANCE & AUDIT GOVERNANCE
// ==========================================
export type CertificateStatus = 'Active' | 'ExpiringSoon' | 'Expired' | 'UnderRenewal';
export type AuditMeetingType = 'Internal' | 'External' | 'Surveillance' | 'Regulatory';
export type AuditMeetingStatus = 'Scheduled' | 'InProgress' | 'Completed' | 'ActionRequired' | 'Cancelled';

export interface ComplianceCertificate {
  id: string;
  name: string;
  standardCode: string;
  certificateNumber: string;
  issuingBody: string;
  issueDateUtc: string;
  expiryDateUtc: string;
  status: CertificateStatus;
  statusName: string;
  documentUrl?: string;
  scopeDescription?: string;
  responsibleEmployeeId?: string;
  responsibleEmployeeName?: string;
  daysUntilExpiry: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
  createdAtUtc: string;
}

export interface CreateCertificateRequest {
  name: string;
  standardCode: string;
  certificateNumber: string;
  issuingBody: string;
  issueDateUtc: string;
  expiryDateUtc: string;
  documentUrl?: string;
  scopeDescription?: string;
  responsibleEmployeeId?: string;
}

export interface AuditMeeting {
  id: string;
  meetingNumber: string;
  title: string;
  auditType: AuditMeetingType;
  auditTypeName: string;
  status: AuditMeetingStatus;
  statusName: string;
  scheduledDateUtc: string;
  location: string;
  leadAuditorEmployeeId?: string;
  leadAuditorName?: string;
  auditedDepartmentId?: string;
  auditedDepartmentName?: string;
  checklistSummary?: string;
  findings?: string;
  nonConformancesCount: number;
  correctiveActionPlan?: string;
  completedAtUtc?: string;
  createdAtUtc: string;
}

export interface CreateAuditMeetingRequest {
  title: string;
  auditType: AuditMeetingType;
  scheduledDateUtc: string;
  location: string;
  leadAuditorEmployeeId?: string;
  auditedDepartmentId?: string;
  checklistSummary?: string;
}

export interface ComplianceDashboard {
  totalCertificates: number;
  activeCertificates: number;
  expiringSoonCertificates: number;
  expiredCertificates: number;
  totalAuditMeetings: number;
  scheduledAuditsCount: number;
  actionRequiredAuditsCount: number;
  completedAuditsCount: number;
}

// ==========================================
// PAYROLL & COMPENSATION MODELS
// ==========================================

export type PayrollStatus = 'Draft' | 'PendingHrSheet' | 'HrSheetSubmitted' | 'Approved' | 'Paid' | 'Cancelled';

export interface PayrollRecord {
  id: string;
  tenantId: string;
  payrollNumber: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  departmentName: string;
  jobTitle: string;
  email: string;
  year: number;
  month: number;
  payPeriod: string;
  baseSalary: number;
  hourlyRate: number;
  overtimeHours: number;
  overtimeRate: number;
  overtimePay: number;
  bonuses: number;
  grossPay: number;
  daysInMonth: number;
  workingDaysExpected: number;
  daysPresent: number;
  daysAbsent: number;
  absenceDeduction: number;
  lateOccurrences: number;
  latePenaltyDeduction: number;
  negativeVacationDays: number;
  vacationDeficitDeduction: number;
  taxRatePercentage: number;
  taxDeduction: number;
  socialSecurityDeduction: number;
  totalDeductions: number;
  netPay: number;
  status: PayrollStatus;
  statusName: string;
  approvedAtUtc?: string;
  isEmailedToEmployee: boolean;
  emailedAtUtc?: string;
  notes?: string;
  createdAtUtc: string;
}

export interface InitiatePayrollRequest {
  employeeId: string;
  year: number;
  month: number;
  defaultTaxRatePercentage?: number;
}

export interface SubmitHrSheetRequest {
  holidaysCount: number;
  absencesCount: number;
  overtimeHours: number;
  consumedDeductionAmount: number;
  notes?: string;
}

export interface GeneratePayrollBatchRequest {
  year: number;
  month: number;
  defaultTaxRatePercentage?: number;
}

export interface ApprovePayrollBatchRequest {
  year: number;
  month: number;
}

export interface PayrollSummary {
  year: number;
  month: number;
  payPeriod: string;
  totalEmployees: number;
  draftCount: number;
  approvedCount: number;
  emailedCount: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  totalOvertimePay: number;
  totalVacationDeficitDeductions: number;
}

export interface EmployeePayslipSpreadsheet {
  payrollRecordId: string;
  payrollNumber: string;
  employeeName: string;
  employeeEmail: string;
  fileName: string;
  contentType: string;
  fileContent: string;
}

export interface SendEmailResult {
  payrollRecordId: string;
  employeeName: string;
  email: string;
  success: boolean;
  message: string;
}

export interface EmployeeSalaryProfile {
  employeeId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  jobTitle: string;
  departmentName: string;
  branchName: string;
  hireDateUtc?: string;
  isActive: boolean;

  // Contract Stored in Database
  contractType: string;
  contractStartDateUtc?: string;
  contractEndDateUtc?: string;
  contractNotes?: string;

  // Stored Contract Monthly Salary & Strict Pricing Formulas
  // Day Price = Salary / 30
  // Hour Price = Day Price / 9 = Salary / 270
  baseMonthlySalary: number;
  dailyRate: number;
  hourlyRate: number;
  overtimeRate: number;

  // Attendance & Absence Ledger
  workingDaysExpected: number;
  daysPresent: number;
  daysAbsent: number;
  absenceDeduction: number;

  // Vacation Quota & Deficits
  vacationDaysAllocated: number;
  vacationDaysUsed: number;
  vacationDaysRemaining: number;
  negativeVacationDays: number;
  vacationDeficitDeduction: number;

  // Late Occurrences & Penalties
  lateOccurrences: number;
  lateHours: number;
  latePenaltyDeduction: number;

  // Overtime Hours
  overtimeHours: number;
  overtimePay: number;

  // Consumed Money
  consumedSalaryDeductions: number;

  // Total Net Salary Calculation
  grossPay: number;
  totalDeductions: number;
  netPay: number;
}

