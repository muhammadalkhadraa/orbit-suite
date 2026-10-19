import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiResponse, Branch, Customer, CreateCustomerRequest, Department, Employee, PagedResponse, TaskItem, TenantDetails, Deal, CreateDealRequest, UpdateDealRequest, UpdateDealStageRequest, DealStage, DealMetrics, SupportTicket, TicketComment, CreateTicketRequest, UpdateTicketRequest, UpdateTicketStatusRequest, AddTicketCommentRequest, TicketMetrics, TicketStatus, TicketPriority, TicketCategory, Product, ProductInventory, StockMovement, CreateProductRequest, UpdateProductRequest, AdjustStockRequest, InventoryMetrics, ProductCategory, StockMovementType, Invoice, InvoiceItem, PaymentRecord, CreateInvoiceRequest, UpdateInvoiceRequest, RecordPaymentRequest, FinancialMetrics, InvoiceStatus, PaymentMethod, WorkOrder, BillOfMaterials, BomItem, CreateWorkOrderRequest, UpdateWorkOrderRequest, UpdateWorkOrderStatusRequest, CreateBomRequest, ManufacturingMetrics, WorkOrderStatus, WorkOrderPriority, LeaveRequest, CreateLeaveRequestRequest, ActionLeaveRequestRequest, LeaveRequestFilter, AttendanceLog, CheckInRequest, CheckOutRequest, RecordAttendanceRequest, AttendanceFilter, ShiftSchedule, CreateShiftScheduleRequest, UpdateShiftScheduleRequest, HrMetrics, LeaveType, LeaveStatus, AttendanceStatus, ShiftType, ExecutiveDashboard, ReportExportRequest, ReportExport, ReportExportHistory, ReportType, ExportFormat, AuditLog, AuditLogFilter } from '../models/models';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  // In-memory demo state for instant offline testing and live UI preview
  private mockBranches: Branch[] = [
    { id: 'br-1', tenantId: '11111111-2222-3333-4444-555555555555', name: 'Global Headquarters', code: 'HQ-NYC', city: 'New York', country: 'USA', isActive: true, employeeCount: 14 },
    { id: 'br-2', tenantId: '11111111-2222-3333-4444-555555555555', name: 'EMEA Logistics Hub', code: 'LOG-LON', city: 'London', country: 'UK', isActive: true, employeeCount: 8 }
  ];

  private mockDepartments: Department[] = [
    { id: 'dp-1', tenantId: '11111111-2222-3333-4444-555555555555', name: 'Operations & Logistics', code: 'OPS', description: 'Supply chain & daily fulfillment', isActive: true, employeeCount: 9 },
    { id: 'dp-2', tenantId: '11111111-2222-3333-4444-555555555555', name: 'Engineering & Technology', code: 'ENG', description: 'Core product development', isActive: true, employeeCount: 13 }
  ];

  private mockEmployees: Employee[] = [
    { id: 'emp-1', tenantId: '11111111-2222-3333-4444-555555555555', userId: 'user-demo-owner', employeeNumber: 'EMP-001', firstName: 'Alex', lastName: 'Morgan', fullName: 'Alex Morgan', email: 'alex.morgan@orbitbusiness.io', jobTitle: 'Founder & CEO', branchId: 'br-1', branchName: 'Global Headquarters', departmentId: 'dp-1', departmentName: 'Operations & Logistics', isActive: true, hireDateUtc: '2024-01-15' },
    { id: 'emp-2', tenantId: '11111111-2222-3333-4444-555555555555', userId: 'user-demo-manager', employeeNumber: 'EMP-002', firstName: 'Sarah', lastName: 'Jenkins', fullName: 'Sarah Jenkins', email: 'sarah.jenkins@orbitbusiness.io', jobTitle: 'Director of Operations', branchId: 'br-1', branchName: 'Global Headquarters', departmentId: 'dp-1', departmentName: 'Operations & Logistics', reportsToEmployeeId: 'emp-1', reportsToName: 'Alex Morgan', isActive: true, hireDateUtc: '2024-02-01' },
    { id: 'emp-3', tenantId: '11111111-2222-3333-4444-555555555555', userId: 'user-demo-employee', employeeNumber: 'EMP-003', firstName: 'David', lastName: 'Lee', fullName: 'David Lee', email: 'david.lee@orbitbusiness.io', jobTitle: 'Logistics Coordinator', branchId: 'br-1', branchName: 'Global Headquarters', departmentId: 'dp-1', departmentName: 'Operations & Logistics', reportsToEmployeeId: 'emp-2', reportsToName: 'Sarah Jenkins', isActive: true, hireDateUtc: '2024-03-10' }
  ];

  private mockTasks: TaskItem[] = [
    { id: 'tsk-1', tenantId: '11111111-2222-3333-4444-555555555555', title: 'Q4 Freight Logistics Audit', description: 'Review container route allocations and negotiate carrier tariffs for transatlantic lanes.', status: 'InProgress', priority: 'High', assignedEmployeeId: 'emp-3', assignedEmployeeName: 'David Lee', departmentId: 'dp-1', departmentName: 'Operations & Logistics', dueDateUtc: '2026-11-01', createdAtUtc: '2026-10-10' },
    { id: 'tsk-2', tenantId: '11111111-2222-3333-4444-555555555555', title: 'Inventory Reorder Threshold Sync', description: 'Calibrate buffer stock parameters across European regional distribution centers.', status: 'Todo', priority: 'Urgent', assignedEmployeeId: 'emp-3', assignedEmployeeName: 'David Lee', departmentId: 'dp-1', departmentName: 'Operations & Logistics', dueDateUtc: '2026-10-25', createdAtUtc: '2026-10-12' },
    { id: 'tsk-3', tenantId: '11111111-2222-3333-4444-555555555555', title: 'Department Operational Review', description: 'Consolidate monthly SLA reports and present staffing roadmap to executive team.', status: 'InReview', priority: 'Medium', assignedEmployeeId: 'emp-2', assignedEmployeeName: 'Sarah Jenkins', departmentId: 'dp-1', departmentName: 'Operations & Logistics', dueDateUtc: '2026-10-28', createdAtUtc: '2026-10-08' },
    { id: 'tsk-4', tenantId: '11111111-2222-3333-4444-555555555555', title: 'Enterprise Security Compliance Sign-off', description: 'Validate zero-trust access enforcement and SOC2 vendor security attestation.', status: 'Done', priority: 'High', assignedEmployeeId: 'emp-1', assignedEmployeeName: 'Alex Morgan', departmentId: 'dp-2', departmentName: 'Engineering & Technology', dueDateUtc: '2026-10-14', completedAtUtc: '2026-10-14', createdAtUtc: '2026-10-01' }
  ];

  private mockCustomers: Customer[] = [
    {
      id: 'cust-1',
      tenantId: '11111111-2222-3333-4444-555555555555',
      companyName: 'Nexus Aerospace Corp',
      contactPerson: 'Dr. Evelyn Vance',
      email: 'evelyn.vance@nexusaero.com',
      phone: '+1 (555) 234-8901',
      website: 'https://nexusaero.com',
      industry: 'Defense & Aerospace',
      status: 'ActiveCustomer',
      assignedEmployeeId: 'emp-2',
      assignedEmployeeName: 'Sarah Jenkins',
      notes: 'Key avionics supplier contract renewed through 2028.',
      createdAtUtc: '2026-04-12T10:00:00Z'
    },
    {
      id: 'cust-2',
      tenantId: '11111111-2222-3333-4444-555555555555',
      companyName: 'Vanguard Quantum Systems',
      contactPerson: 'Marcus Thorne',
      email: 'm.thorne@vanguardquantum.io',
      phone: '+1 (555) 876-5432',
      website: 'https://vanguardquantum.io',
      industry: 'High Performance Computing',
      status: 'Prospect',
      assignedEmployeeId: 'emp-3',
      assignedEmployeeName: 'David Lee',
      notes: 'Evaluating multi-site enterprise license for Q1 rollout.',
      createdAtUtc: '2026-08-20T14:30:00Z'
    },
    {
      id: 'cust-3',
      tenantId: '11111111-2222-3333-4444-555555555555',
      companyName: 'Hyperion Robotics Ltd',
      contactPerson: 'Claire Bennett',
      email: 'c.bennett@hyperionrobotics.de',
      phone: '+49 30 901820',
      website: 'https://hyperionrobotics.de',
      industry: 'Robotics & Automation',
      status: 'Lead',
      assignedEmployeeId: 'emp-3',
      assignedEmployeeName: 'David Lee',
      notes: 'Inbound inquiry from Munich Automation Expo.',
      createdAtUtc: '2026-10-02T09:15:00Z'
    },
    {
      id: 'cust-4',
      tenantId: '11111111-2222-3333-4444-555555555555',
      companyName: 'Solaris Maritime Freight',
      contactPerson: 'Capt. Henrik Lindqvist',
      email: 'operations@solarismaritime.se',
      phone: '+46 8 123 4567',
      website: 'https://solarismaritime.se',
      industry: 'Maritime Logistics',
      status: 'ActiveCustomer',
      assignedEmployeeId: 'emp-1',
      assignedEmployeeName: 'Alex Morgan',
      notes: 'Executive account managed at founder level.',
      createdAtUtc: '2026-02-15T11:45:00Z'
    }
  ];

  private mockDeals: Deal[] = [
    {
      id: 'deal-1',
      tenantId: '11111111-2222-3333-4444-555555555555',
      title: 'Acme Industrial Systems Upgrade',
      customerId: 'cust-1',
      customerName: 'Northwind Traders Inc.',
      assignedEmployeeId: 'emp-3',
      assignedEmployeeName: 'David Lee',
      amount: 85000,
      currency: 'USD',
      stage: 'Proposal',
      stageName: 'Proposal',
      probability: 60,
      expectedCloseDateUtc: '2026-11-30',
      notes: 'Finalizing statement of work for 12 warehouse nodes.',
      createdAtUtc: '2026-02-10T14:00:00Z'
    },
    {
      id: 'deal-2',
      tenantId: '11111111-2222-3333-4444-555555555555',
      title: 'Cloud Logistics Fleet Integration',
      customerId: 'cust-2',
      customerName: 'Helios Energy Dynamics',
      assignedEmployeeId: 'emp-2',
      assignedEmployeeName: 'Sarah Jenkins',
      amount: 140000,
      currency: 'USD',
      stage: 'Negotiation',
      stageName: 'Negotiation',
      probability: 80,
      expectedCloseDateUtc: '2026-11-15',
      notes: 'Legal reviewing master services agreement terms.',
      createdAtUtc: '2026-02-05T09:30:00Z'
    },
    {
      id: 'deal-3',
      tenantId: '11111111-2222-3333-4444-555555555555',
      title: 'Autonomous Docking Sensors Pilot',
      customerId: 'cust-3',
      customerName: 'Solaris Maritime Logistics',
      assignedEmployeeId: 'emp-1',
      assignedEmployeeName: 'Alex Morgan',
      amount: 220000,
      currency: 'USD',
      stage: 'ClosedWon',
      stageName: 'ClosedWon',
      probability: 100,
      closedAtUtc: '2026-03-01T16:00:00Z',
      expectedCloseDateUtc: '2026-03-01',
      notes: 'Multi-year contract signed and initial deposit received.',
      createdAtUtc: '2026-01-20T10:00:00Z'
    },
    {
      id: 'deal-4',
      tenantId: '11111111-2222-3333-4444-555555555555',
      title: 'Predictive Maintenance Package',
      customerId: 'cust-1',
      customerName: 'Northwind Traders Inc.',
      assignedEmployeeId: 'emp-3',
      assignedEmployeeName: 'David Lee',
      amount: 45000,
      currency: 'USD',
      stage: 'Qualified',
      stageName: 'Qualified',
      probability: 40,
      expectedCloseDateUtc: '2026-12-15',
      notes: 'Initial technical feasibility session completed.',
      createdAtUtc: '2026-02-18T11:00:00Z'
    },
    {
      id: 'deal-5',
      tenantId: '11111111-2222-3333-4444-555555555555',
      title: 'Warehouse Robotics Trial',
      customerId: 'cust-2',
      customerName: 'Helios Energy Dynamics',
      assignedEmployeeId: 'emp-3',
      assignedEmployeeName: 'David Lee',
      amount: 60000,
      currency: 'USD',
      stage: 'Lead',
      stageName: 'Lead',
      probability: 20,
      expectedCloseDateUtc: '2026-12-31',
      notes: 'Inbound inquiry from procurement team.',
      createdAtUtc: '2026-02-25T15:20:00Z'
    },
    {
      id: 'deal-6',
      tenantId: '11111111-2222-3333-4444-555555555555',
      title: 'Legacy SCADA Migration',
      customerId: 'cust-3',
      customerName: 'Solaris Maritime Logistics',
      assignedEmployeeId: 'emp-2',
      assignedEmployeeName: 'Sarah Jenkins',
      amount: 30000,
      currency: 'USD',
      stage: 'ClosedLost',
      stageName: 'ClosedLost',
      probability: 0,
      closedAtUtc: '2026-02-28T17:00:00Z',
      lostReason: 'Client elected to keep internal legacy solution.',
      expectedCloseDateUtc: '2026-02-28',
      notes: 'May revisit in Q3 next year.',
      createdAtUtc: '2026-01-10T08:00:00Z'
    }
  ];

  private mockTickets: SupportTicket[] = [
    {
      id: 'tck-1',
      tenantId: '11111111-2222-3333-4444-555555555555',
      ticketNumber: 'TCK-1001',
      subject: 'Warehouse dock sensor telemetry timeout',
      description: 'Telemetry nodes 4 through 7 stopped reporting heartbeat packets over MQTT gateway. Requires immediate firmware verification.',
      customerId: 'cust-1',
      customerName: 'Northwind Traders Inc.',
      assignedEmployeeId: 'emp-3',
      assignedEmployeeName: 'David Lee',
      createdByEmployeeId: 'emp-1',
      createdByEmployeeName: 'Alex Morgan',
      status: 'Open',
      statusName: 'Open',
      priority: 'Urgent',
      priorityName: 'Urgent',
      category: 'Technical',
      categoryName: 'Technical',
      commentsCount: 2,
      comments: [
        {
          id: 'cm-1',
          ticketId: 'tck-1',
          authorEmployeeId: 'emp-1',
          authorName: 'Alex Morgan',
          commentText: 'Customer alerted us via primary SLA hotline at 08:30 UTC.',
          isInternal: false,
          createdAtUtc: '2026-02-20T08:35:00Z'
        },
        {
          id: 'cm-2',
          ticketId: 'tck-1',
          authorEmployeeId: 'emp-3',
          authorName: 'David Lee',
          commentText: 'Diagnosed: Gateway buffer overflow after switch port reset. Pushing hotfix payload now.',
          isInternal: true,
          createdAtUtc: '2026-02-20T09:15:00Z'
        }
      ],
      createdAtUtc: '2026-02-20T08:30:00Z'
    },
    {
      id: 'tck-2',
      tenantId: '11111111-2222-3333-4444-555555555555',
      ticketNumber: 'TCK-1002',
      subject: 'Monthly consolidated invoice reconciliation dispute',
      description: 'Customer requests invoice breakdown for branch terminal logistics fees applied on February billing statement.',
      customerId: 'cust-2',
      customerName: 'Helios Energy Dynamics',
      assignedEmployeeId: 'emp-2',
      assignedEmployeeName: 'Sarah Jenkins',
      createdByEmployeeId: 'emp-2',
      createdByEmployeeName: 'Sarah Jenkins',
      status: 'Pending',
      statusName: 'Pending',
      priority: 'High',
      priorityName: 'High',
      category: 'Billing',
      categoryName: 'Billing',
      commentsCount: 1,
      comments: [
        {
          id: 'cm-3',
          ticketId: 'tck-2',
          authorEmployeeId: 'emp-2',
          authorName: 'Sarah Jenkins',
          commentText: 'Requested billing department to issue updated itemized ledger statement.',
          isInternal: true,
          createdAtUtc: '2026-02-22T14:10:00Z'
        }
      ],
      createdAtUtc: '2026-02-22T11:00:00Z'
    },
    {
      id: 'tck-3',
      tenantId: '11111111-2222-3333-4444-555555555555',
      ticketNumber: 'TCK-1003',
      subject: 'Autonomous ship docking API key rotation',
      description: 'Automated renewal of production REST API bearer token and webhook receiver URL verification.',
      customerId: 'cust-3',
      customerName: 'Solaris Maritime Logistics',
      assignedEmployeeId: 'emp-3',
      assignedEmployeeName: 'David Lee',
      createdByEmployeeId: 'emp-3',
      createdByEmployeeName: 'David Lee',
      status: 'Resolved',
      statusName: 'Resolved',
      priority: 'Medium',
      priorityName: 'Medium',
      category: 'Account',
      categoryName: 'Account',
      resolvedAtUtc: '2026-02-24T16:45:00Z',
      resolutionSummary: 'Rotated API credentials and verified zero drop in telemetry ingest.',
      commentsCount: 1,
      comments: [
        {
          id: 'cm-4',
          ticketId: 'tck-3',
          authorEmployeeId: 'emp-3',
          authorName: 'David Lee',
          commentText: 'Client security officer verified key installation successfully.',
          isInternal: false,
          createdAtUtc: '2026-02-24T16:40:00Z'
        }
      ],
      createdAtUtc: '2026-02-24T13:00:00Z'
    }
  ];

  private mockProducts: Product[] = [
    {
      id: 'prod-1',
      tenantId: '11111111-2222-3333-4444-555555555555',
      sku: 'GW-TITAN-X1',
      name: 'Titan Edge Enterprise Gateway',
      description: 'Industrial quad-core IoT edge gateway with dual Gigabit WAN and redundant power supply.',
      category: 'Hardware',
      categoryName: 'Hardware',
      unitOfMeasure: 'unit',
      unitPrice: 1850.00,
      unitCost: 950.00,
      reorderLevel: 10,
      isActive: true,
      totalQuantityOnHand: 45,
      totalQuantityReserved: 5,
      totalQuantityAvailable: 40,
      isLowStock: false,
      inventoryValuation: 42750.00,
      branchInventories: [
        {
          id: 'pi-1',
          productId: 'prod-1',
          productName: 'Titan Edge Enterprise Gateway',
          productSku: 'GW-TITAN-X1',
          branchId: 'br-1',
          branchName: 'Global Headquarters',
          branchCode: 'HQ-NYC',
          quantityOnHand: 30,
          quantityReserved: 5,
          quantityAvailable: 25,
          aisleBinLocation: 'Aisle A-1, Bin 10',
          isLowStock: false
        },
        {
          id: 'pi-2',
          productId: 'prod-1',
          productName: 'Titan Edge Enterprise Gateway',
          productSku: 'GW-TITAN-X1',
          branchId: 'br-2',
          branchName: 'EMEA Logistics Hub',
          branchCode: 'LOG-LON',
          quantityOnHand: 15,
          quantityReserved: 0,
          quantityAvailable: 15,
          aisleBinLocation: 'Aisle E-3, Bin 04',
          isLowStock: false
        }
      ],
      createdAtUtc: '2026-01-10T10:00:00Z'
    },
    {
      id: 'prod-2',
      tenantId: '11111111-2222-3333-4444-555555555555',
      sku: 'SW-ORBIT-ENT',
      name: 'Orbit Telemetry Platform License (Annual)',
      description: 'High-availability SaaS telemetry license for up to 500 managed IoT nodes.',
      category: 'Software',
      categoryName: 'Software',
      unitOfMeasure: 'license',
      unitPrice: 4200.00,
      unitCost: 400.00,
      reorderLevel: 5,
      isActive: true,
      totalQuantityOnHand: 120,
      totalQuantityReserved: 10,
      totalQuantityAvailable: 110,
      isLowStock: false,
      inventoryValuation: 48000.00,
      branchInventories: [
        {
          id: 'pi-3',
          productId: 'prod-2',
          productName: 'Orbit Telemetry Platform License (Annual)',
          productSku: 'SW-ORBIT-ENT',
          branchId: 'br-1',
          branchName: 'Global Headquarters',
          branchCode: 'HQ-NYC',
          quantityOnHand: 120,
          quantityReserved: 10,
          quantityAvailable: 110,
          aisleBinLocation: 'Digital Cloud Vault',
          isLowStock: false
        }
      ],
      createdAtUtc: '2026-01-15T12:00:00Z'
    },
    {
      id: 'prod-3',
      tenantId: '11111111-2222-3333-4444-555555555555',
      sku: 'OPT-QSFP28-100G',
      name: 'High-Speed Optical Transceiver 100G',
      description: 'Hot-pluggable QSFP28 optical transceiver module for datacenter interconnects.',
      category: 'Components',
      categoryName: 'Components',
      unitOfMeasure: 'pcs',
      unitPrice: 280.00,
      unitCost: 140.00,
      reorderLevel: 25,
      isActive: true,
      totalQuantityOnHand: 18,
      totalQuantityReserved: 4,
      totalQuantityAvailable: 14,
      isLowStock: true,
      inventoryValuation: 2520.00,
      branchInventories: [
        {
          id: 'pi-4',
          productId: 'prod-3',
          productName: 'High-Speed Optical Transceiver 100G',
          productSku: 'OPT-QSFP28-100G',
          branchId: 'br-1',
          branchName: 'Global Headquarters',
          branchCode: 'HQ-NYC',
          quantityOnHand: 10,
          quantityReserved: 2,
          quantityAvailable: 8,
          aisleBinLocation: 'Cabinet C-2, Drawer 4',
          isLowStock: true
        },
        {
          id: 'pi-5',
          productId: 'prod-3',
          productName: 'High-Speed Optical Transceiver 100G',
          productSku: 'OPT-QSFP28-100G',
          branchId: 'br-2',
          branchName: 'EMEA Logistics Hub',
          branchCode: 'LOG-LON',
          quantityOnHand: 8,
          quantityReserved: 2,
          quantityAvailable: 6,
          aisleBinLocation: 'Cabinet D-1, Drawer 1',
          isLowStock: true
        }
      ],
      createdAtUtc: '2026-02-01T09:00:00Z'
    },
    {
      id: 'prod-4',
      tenantId: '11111111-2222-3333-4444-555555555555',
      sku: 'IOT-SENS-IND',
      name: 'Industrial Vibration & Temperature Sensor',
      description: 'Ruggedized IP68 wireless condition monitoring sensor node with LoRaWAN connectivity.',
      category: 'Electronics',
      categoryName: 'Electronics',
      unitOfMeasure: 'pcs',
      unitPrice: 620.00,
      unitCost: 310.00,
      reorderLevel: 15,
      isActive: true,
      totalQuantityOnHand: 8,
      totalQuantityReserved: 0,
      totalQuantityAvailable: 8,
      isLowStock: true,
      inventoryValuation: 2480.00,
      branchInventories: [
        {
          id: 'pi-6',
          productId: 'prod-4',
          productName: 'Industrial Vibration & Temperature Sensor',
          productSku: 'IOT-SENS-IND',
          branchId: 'br-1',
          branchName: 'Global Headquarters',
          branchCode: 'HQ-NYC',
          quantityOnHand: 8,
          quantityReserved: 0,
          quantityAvailable: 8,
          aisleBinLocation: 'Aisle B-4, Rack 2',
          isLowStock: true
        }
      ],
      createdAtUtc: '2026-02-12T14:30:00Z'
    },
    {
      id: 'prod-5',
      tenantId: '11111111-2222-3333-4444-555555555555',
      sku: 'BAT-LI-48V',
      name: 'Lithium Battery Module 48V 100Ah',
      description: 'Rack-mount modular energy storage pack with intelligent BMS management.',
      category: 'RawMaterials',
      categoryName: 'RawMaterials',
      unitOfMeasure: 'cell',
      unitPrice: 890.00,
      unitCost: 520.00,
      reorderLevel: 10,
      isActive: true,
      totalQuantityOnHand: 0,
      totalQuantityReserved: 0,
      totalQuantityAvailable: 0,
      isLowStock: true,
      inventoryValuation: 0.00,
      branchInventories: [
        {
          id: 'pi-7',
          productId: 'prod-5',
          productName: 'Lithium Battery Module 48V 100Ah',
          productSku: 'BAT-LI-48V',
          branchId: 'br-1',
          branchName: 'Global Headquarters',
          branchCode: 'HQ-NYC',
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityAvailable: 0,
          aisleBinLocation: 'Hazardous Materials Bay 2',
          isLowStock: true
        }
      ],
      createdAtUtc: '2026-02-18T16:00:00Z'
    }
  ];

  private mockStockMovements: StockMovement[] = [
    {
      id: 'mov-1',
      productId: 'prod-1',
      productName: 'Titan Edge Enterprise Gateway',
      productSku: 'GW-TITAN-X1',
      branchId: 'br-1',
      branchName: 'Global Headquarters',
      type: 'Receipt',
      typeName: 'Receipt',
      quantity: 25,
      unitCost: 950.00,
      totalCost: 23750.00,
      referenceNumber: 'PO-2026-8812',
      reason: 'Batch production supplier delivery',
      performedByEmployeeId: 'emp-2',
      performedByEmployeeName: 'Sarah Jenkins',
      timestampUtc: '2026-02-10T11:30:00Z'
    },
    {
      id: 'mov-2',
      productId: 'prod-3',
      productName: 'High-Speed Optical Transceiver 100G',
      productSku: 'OPT-QSFP28-100G',
      branchId: 'br-1',
      branchName: 'Global Headquarters',
      destinationBranchId: 'br-2',
      destinationBranchName: 'EMEA Logistics Hub',
      type: 'Transfer',
      typeName: 'Transfer',
      quantity: 10,
      unitCost: 140.00,
      totalCost: 1400.00,
      referenceNumber: 'TRF-LON-044',
      reason: 'Cross-warehouse stock rebalancing for London deployment',
      performedByEmployeeId: 'emp-3',
      performedByEmployeeName: 'David Lee',
      timestampUtc: '2026-02-14T14:15:00Z'
    },
    {
      id: 'mov-3',
      productId: 'prod-4',
      productName: 'Industrial Vibration & Temperature Sensor',
      productSku: 'IOT-SENS-IND',
      branchId: 'br-1',
      branchName: 'Global Headquarters',
      type: 'SaleShipment',
      typeName: 'SaleShipment',
      quantity: 5,
      unitCost: 310.00,
      totalCost: 1550.00,
      referenceNumber: 'SO-90184',
      reason: 'Customer shipment for Nexus Aerospace order',
      performedByEmployeeId: 'emp-3',
      performedByEmployeeName: 'David Lee',
      timestampUtc: '2026-02-18T10:00:00Z'
    },
    {
      id: 'mov-4',
      productId: 'prod-1',
      productName: 'Titan Edge Enterprise Gateway',
      productSku: 'GW-TITAN-X1',
      branchId: 'br-2',
      branchName: 'EMEA Logistics Hub',
      type: 'AdjustmentIn',
      typeName: 'AdjustmentIn',
      quantity: 5,
      unitCost: 950.00,
      totalCost: 4750.00,
      referenceNumber: 'ADJ-CYCLE-01',
      reason: 'Quarterly cycle count discrepancy resolution',
      performedByEmployeeId: 'emp-2',
      performedByEmployeeName: 'Sarah Jenkins',
      timestampUtc: '2026-02-22T16:20:00Z'
    }
  ];

  private mockInvoices: Invoice[] = [
    {
      id: 'inv-1',
      tenantId: '11111111-2222-3333-4444-555555555555',
      invoiceNumber: 'INV-2026-0001',
      customerId: 'cust-1',
      customerName: 'Nexus Aerospace Corp',
      customerEmail: 'evelyn.vance@nexusaero.com',
      dealId: 'deal-1',
      dealTitle: 'Acme Industrial Systems Upgrade',
      issueDateUtc: '2026-02-15T09:00:00Z',
      dueDateUtc: '2026-03-15T09:00:00Z',
      status: 'PartiallyPaid',
      statusName: 'PartiallyPaid',
      currency: 'USD',
      subtotal: 12000.00,
      taxRate: 10.0,
      taxAmount: 1200.00,
      discountAmount: 700.00,
      totalAmount: 12500.00,
      amountPaid: 6000.00,
      balanceDue: 6500.00,
      isOverdue: false,
      notes: 'Initial delivery installment for avionics gateway hardware.',
      termsAndConditions: 'Net 30 days. Late balances subject to 1.5% interest per month.',
      items: [
        {
          id: 'item-1',
          invoiceId: 'inv-1',
          productId: 'prod-1',
          productSku: 'GW-TITAN-X1',
          productName: 'Titan Edge Enterprise Gateway',
          description: 'Industrial Edge Gateways with Redundant PSU',
          quantity: 6,
          unitPrice: 1850.00,
          taxAmount: 1110.00,
          totalAmount: 11100.00
        },
        {
          id: 'item-2',
          invoiceId: 'inv-1',
          description: 'On-site Field Deployment & System Configuration',
          quantity: 9,
          unitPrice: 100.00,
          taxAmount: 90.00,
          totalAmount: 900.00
        }
      ],
      payments: [
        {
          id: 'pay-1',
          invoiceId: 'inv-1',
          paymentNumber: 'PAY-2026-0001',
          amount: 6000.00,
          paymentDateUtc: '2026-02-25T14:30:00Z',
          method: 'BankTransfer',
          methodName: 'BankTransfer',
          referenceNumber: 'WIRE-US-99120',
          notes: '50% advance wire deposit',
          recordedByEmployeeName: 'Sarah Jenkins'
        }
      ],
      createdAtUtc: '2026-02-15T09:00:00Z'
    },
    {
      id: 'inv-2',
      tenantId: '11111111-2222-3333-4444-555555555555',
      invoiceNumber: 'INV-2026-0002',
      customerId: 'cust-2',
      customerName: 'Vanguard Quantum Systems',
      customerEmail: 'm.thorne@vanguardquantum.io',
      dealId: 'deal-2',
      dealTitle: 'Cloud Logistics Fleet Integration',
      issueDateUtc: '2026-01-20T10:00:00Z',
      dueDateUtc: '2026-02-20T10:00:00Z',
      paidAtUtc: '2026-02-18T16:00:00Z',
      status: 'Paid',
      statusName: 'Paid',
      currency: 'USD',
      subtotal: 4200.00,
      taxRate: 8.5,
      taxAmount: 357.00,
      discountAmount: 0.00,
      totalAmount: 4557.00,
      amountPaid: 4557.00,
      balanceDue: 0.00,
      isOverdue: false,
      notes: 'Annual SaaS Telemetry Platform Cloud Tier license.',
      termsAndConditions: 'Payment due upon invoice delivery.',
      items: [
        {
          id: 'item-3',
          invoiceId: 'inv-2',
          productId: 'prod-2',
          productSku: 'SW-ORBIT-ENT',
          productName: 'Orbit Telemetry Platform License (Annual)',
          description: 'Enterprise Cloud Instance — 500 nodes',
          quantity: 1,
          unitPrice: 4200.00,
          taxAmount: 357.00,
          totalAmount: 4200.00
        }
      ],
      payments: [
        {
          id: 'pay-2',
          invoiceId: 'inv-2',
          paymentNumber: 'PAY-2026-0002',
          amount: 4557.00,
          paymentDateUtc: '2026-02-18T16:00:00Z',
          method: 'CreditCard',
          methodName: 'CreditCard',
          referenceNumber: 'AUTH-CC-84210',
          notes: 'Paid via automated corporate card portal',
          recordedByEmployeeName: 'Alex Morgan'
        }
      ],
      createdAtUtc: '2026-01-20T10:00:00Z'
    },
    {
      id: 'inv-3',
      tenantId: '11111111-2222-3333-4444-555555555555',
      invoiceNumber: 'INV-2026-0003',
      customerId: 'cust-4',
      customerName: 'Solaris Maritime Freight',
      customerEmail: 'operations@solarismaritime.se',
      issueDateUtc: '2026-01-10T08:00:00Z',
      dueDateUtc: '2026-02-10T08:00:00Z',
      status: 'Overdue',
      statusName: 'Overdue',
      currency: 'USD',
      subtotal: 7800.00,
      taxRate: 0.0,
      taxAmount: 0.00,
      discountAmount: 0.00,
      totalAmount: 7800.00,
      amountPaid: 0.00,
      balanceDue: 7800.00,
      isOverdue: true,
      notes: 'Transceiver components and telemetry hardware suite.',
      termsAndConditions: 'Net 30 days.',
      items: [
        {
          id: 'item-4',
          invoiceId: 'inv-3',
          productId: 'prod-3',
          productSku: 'OPT-QSFP28-100G',
          productName: 'High-Speed Optical Transceiver 100G',
          description: 'Optical modules for maritime harbor communications',
          quantity: 15,
          unitPrice: 280.00,
          taxAmount: 0.00,
          totalAmount: 4200.00
        },
        {
          id: 'item-5',
          invoiceId: 'inv-3',
          productId: 'prod-4',
          productSku: 'IOT-SENS-IND',
          productName: 'Industrial Vibration & Temperature Sensor',
          description: 'IP68 wireless condition monitoring nodes',
          quantity: 5,
          unitPrice: 720.00,
          taxAmount: 0.00,
          totalAmount: 3600.00
        }
      ],
      payments: [],
      createdAtUtc: '2026-01-10T08:00:00Z'
    },
    {
      id: 'inv-4',
      tenantId: '11111111-2222-3333-4444-555555555555',
      invoiceNumber: 'INV-2026-0004',
      customerId: 'cust-3',
      customerName: 'Hyperion Robotics Ltd',
      customerEmail: 'c.bennett@hyperionrobotics.de',
      issueDateUtc: '2026-02-28T11:00:00Z',
      dueDateUtc: '2026-03-30T11:00:00Z',
      status: 'Draft',
      statusName: 'Draft',
      currency: 'USD',
      subtotal: 5500.00,
      taxRate: 19.0,
      taxAmount: 1045.00,
      discountAmount: 500.00,
      totalAmount: 6045.00,
      amountPaid: 0.00,
      balanceDue: 6045.00,
      isOverdue: false,
      notes: 'Initial quotation drafted following Munich Robotics demo.',
      termsAndConditions: 'Standard 30 days payment terms upon issuance.',
      items: [
        {
          id: 'item-6',
          invoiceId: 'inv-4',
          description: 'Robotic Arm Integration Evaluation Kit',
          quantity: 1,
          unitPrice: 5500.00,
          taxAmount: 1045.00,
          totalAmount: 5500.00
        }
      ],
      payments: [],
      createdAtUtc: '2026-02-28T11:00:00Z'
    }
  ];

  constructor(private http: HttpClient, private authService: AuthService) {}

  // 1. Company / Organization
  public getCompany(): Observable<ApiResponse<TenantDetails>> {
    return this.http.get<ApiResponse<TenantDetails>>(`${this.baseUrl}/organization/company`).pipe(
      catchError(() => of({
        success: true,
        data: {
          id: this.authService.getActiveTenantId() || '11111111-2222-3333-4444-555555555555',
          name: 'Apex Global Enterprises',
          slug: 'apex-global',
          status: 'Active',
          industry: 'Industrial Automation & Supply Chain',
          timeZoneId: 'America/New_York',
          currencyCode: 'USD',
          branchCount: this.mockBranches.length,
          departmentCount: this.mockDepartments.length,
          employeeCount: this.mockEmployees.length,
          createdAtUtc: '2024-01-01'
        }
      }))
    );
  }

  // 2. Branches
  public getBranches(): Observable<ApiResponse<Branch[]>> {
    return this.http.get<ApiResponse<Branch[]>>(`${this.baseUrl}/organization/branches`).pipe(
      catchError(() => of({ success: true, data: this.mockBranches }))
    );
  }

  public createBranch(branch: Partial<Branch>): Observable<ApiResponse<Branch>> {
    return this.http.post<ApiResponse<Branch>>(`${this.baseUrl}/organization/branches`, branch).pipe(
      catchError(() => {
        const newBranch: Branch = {
          id: 'br-' + Date.now(),
          tenantId: this.authService.getActiveTenantId() || '',
          name: branch.name || '',
          code: (branch.code || '').toUpperCase(),
          address: branch.address,
          city: branch.city,
          country: branch.country,
          isActive: true,
          employeeCount: 0
        };
        this.mockBranches.push(newBranch);
        return of({ success: true, data: newBranch, message: 'Branch created successfully.' });
      })
    );
  }

  public updateBranch(id: string, branch: Partial<Branch>): Observable<ApiResponse<Branch>> {
    return this.http.put<ApiResponse<Branch>>(`${this.baseUrl}/organization/branches/${id}`, branch).pipe(
      catchError(() => {
        const index = this.mockBranches.findIndex(b => b.id === id);
        if (index !== -1) {
          const updated: Branch = {
            ...this.mockBranches[index],
            ...branch,
            code: (branch.code ?? this.mockBranches[index].code).toUpperCase()
          };
          this.mockBranches[index] = updated;
          return of({ success: true, data: updated, message: 'Branch updated successfully.' });
        }
        return of({ success: false, data: {} as Branch, message: 'Branch not found.' });
      })
    );
  }

  public deleteBranch(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/organization/branches/${id}`).pipe(
      catchError(() => {
        this.mockBranches = this.mockBranches.filter(b => b.id !== id);
        return of({ success: true, data: null, message: 'Branch deleted successfully.' });
      })
    );
  }

  // 3. Departments
  public getDepartments(): Observable<ApiResponse<Department[]>> {
    return this.http.get<ApiResponse<Department[]>>(`${this.baseUrl}/organization/departments`).pipe(
      catchError(() => of({ success: true, data: this.mockDepartments }))
    );
  }

  public createDepartment(dept: Partial<Department>): Observable<ApiResponse<Department>> {
    return this.http.post<ApiResponse<Department>>(`${this.baseUrl}/organization/departments`, dept).pipe(
      catchError(() => {
        const newDept: Department = {
          id: 'dp-' + Date.now(),
          tenantId: this.authService.getActiveTenantId() || '',
          name: dept.name || '',
          code: (dept.code || '').toUpperCase(),
          description: dept.description,
          isActive: true,
          employeeCount: 0
        };
        this.mockDepartments.push(newDept);
        return of({ success: true, data: newDept, message: 'Department created successfully.' });
      })
    );
  }

  public updateDepartment(id: string, dept: Partial<Department>): Observable<ApiResponse<Department>> {
    return this.http.put<ApiResponse<Department>>(`${this.baseUrl}/organization/departments/${id}`, dept).pipe(
      catchError(() => {
        const index = this.mockDepartments.findIndex(d => d.id === id);
        if (index !== -1) {
          const updated: Department = {
            ...this.mockDepartments[index],
            ...dept,
            code: (dept.code ?? this.mockDepartments[index].code).toUpperCase()
          };
          this.mockDepartments[index] = updated;
          return of({ success: true, data: updated, message: 'Department updated successfully.' });
        }
        return of({ success: false, data: {} as Department, message: 'Department not found.' });
      })
    );
  }

  public deleteDepartment(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/organization/departments/${id}`).pipe(
      catchError(() => {
        this.mockDepartments = this.mockDepartments.filter(d => d.id !== id);
        return of({ success: true, data: null, message: 'Department deleted successfully.' });
      })
    );
  }

  // 4. Employees
  public getEmployees(search?: string): Observable<ApiResponse<PagedResponse<Employee>>> {
    return this.http.get<ApiResponse<PagedResponse<Employee>>>(`${this.baseUrl}/employees`).pipe(
      catchError(() => {
        let list = [...this.mockEmployees];
        if (search) {
          const s = search.toLowerCase();
          list = list.filter(e => e.fullName.toLowerCase().includes(s) || e.jobTitle.toLowerCase().includes(s));
        }
        return of({
          success: true,
          data: {
            success: true,
            data: list,
            pageNumber: 1,
            pageSize: 20,
            totalCount: list.length,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false
          }
        });
      })
    );
  }

  public createEmployee(emp: Partial<Employee>): Observable<ApiResponse<Employee>> {
    return this.http.post<ApiResponse<Employee>>(`${this.baseUrl}/employees`, emp).pipe(
      catchError(() => {
        const newEmp: Employee = {
          id: 'emp-' + Date.now(),
          tenantId: this.authService.getActiveTenantId() || '',
          employeeNumber: emp.employeeNumber || `EMP-${Date.now().toString().slice(-3)}`,
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          fullName: `${emp.firstName} ${emp.lastName}`.trim(),
          email: emp.email || '',
          phone: emp.phone,
          jobTitle: emp.jobTitle || '',
          branchId: emp.branchId,
          departmentId: emp.departmentId,
          isActive: true,
          hireDateUtc: new Date().toISOString()
        };
        this.mockEmployees.push(newEmp);
        return of({ success: true, data: newEmp, message: 'Employee profile created successfully.' });
      })
    );
  }

  public updateEmployee(id: string, emp: Partial<Employee>): Observable<ApiResponse<Employee>> {
    return this.http.put<ApiResponse<Employee>>(`${this.baseUrl}/employees/${id}`, emp).pipe(
      catchError(() => {
        const index = this.mockEmployees.findIndex(e => e.id === id);
        if (index !== -1) {
          const current = this.mockEmployees[index];
          const updated: Employee = {
            ...current,
            ...emp,
            fullName: `${emp.firstName ?? current.firstName} ${emp.lastName ?? current.lastName}`.trim()
          };
          this.mockEmployees[index] = updated;
          return of({ success: true, data: updated, message: 'Employee profile updated successfully.' });
        }
        return of({ success: false, data: {} as Employee, message: 'Employee not found.' });
      })
    );
  }

  public deleteEmployee(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/employees/${id}`).pipe(
      catchError(() => {
        this.mockEmployees = this.mockEmployees.filter(e => e.id !== id);
        return of({ success: true, data: null, message: 'Employee profile deleted successfully.' });
      })
    );
  }

  // 5. Tasks (Scoped by Current User & Role)
  public getTasks(): Observable<ApiResponse<PagedResponse<TaskItem>>> {
    return this.http.get<ApiResponse<PagedResponse<TaskItem>>>(`${this.baseUrl}/tasks`).pipe(
      catchError(() => {
        const role = this.authService.currentRole || 'Employee';
        let filtered = [...this.mockTasks];

        // Client demo scoping matching backend TaskService logic
        if (role === 'Employee') {
          // Employee sees own tasks (David Lee: emp-3)
          filtered = filtered.filter(t => t.assignedEmployeeId === 'emp-3');
        } else if (role === 'Manager') {
          // Manager sees own tasks and direct report tasks (Sarah Jenkins: emp-2 & David Lee: emp-3)
          filtered = filtered.filter(t => t.assignedEmployeeId === 'emp-2' || t.assignedEmployeeId === 'emp-3');
        }
        // Owner/Admin sees all tasks

        return of({
          success: true,
          data: {
            success: true,
            data: filtered,
            pageNumber: 1,
            pageSize: 20,
            totalCount: filtered.length,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false
          }
        });
      })
    );
  }

  public createTask(task: Partial<TaskItem>): Observable<ApiResponse<TaskItem>> {
    return this.http.post<ApiResponse<TaskItem>>(`${this.baseUrl}/tasks`, task).pipe(
      catchError(() => {
        const newTask: TaskItem = {
          id: 'tsk-' + Date.now(),
          tenantId: this.authService.getActiveTenantId() || '',
          title: task.title || '',
          description: task.description,
          status: 'Todo',
          priority: task.priority || 'Medium',
          assignedEmployeeId: task.assignedEmployeeId || 'emp-3',
          assignedEmployeeName: this.mockEmployees.find(e => e.id === task.assignedEmployeeId)?.fullName || 'David Lee',
          departmentId: task.departmentId,
          departmentName: this.mockDepartments.find(d => d.id === task.departmentId)?.name || 'Operations & Logistics',
          dueDateUtc: task.dueDateUtc,
          createdAtUtc: new Date().toISOString()
        };
        this.mockTasks.unshift(newTask);
        return of({ success: true, data: newTask, message: 'Task created successfully.' });
      })
    );
  }

  public updateTaskStatus(taskId: string, status: TaskItem['status']): Observable<ApiResponse<TaskItem>> {
    return this.http.patch<ApiResponse<TaskItem>>(`${this.baseUrl}/tasks/${taskId}/status`, { status }).pipe(
      catchError(() => {
        const task = this.mockTasks.find(t => t.id === taskId);
        if (task) {
          task.status = status;
          if (status === 'Done') task.completedAtUtc = new Date().toISOString();
        }
        return of({ success: true, data: task!, message: 'Task status updated.' });
      })
    );
  }

  public deleteTask(taskId: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/tasks/${taskId}`).pipe(
      catchError(() => {
        this.mockTasks = this.mockTasks.filter(t => t.id !== taskId);
        return of({ success: true, data: null, message: 'Task deleted.' });
      })
    );
  }

  // 5. CRM & Customers
  public getCustomers(filter?: any): Observable<ApiResponse<PagedResponse<Customer>>> {
    return this.http.get<ApiResponse<PagedResponse<Customer>>>(`${this.baseUrl}/customers`, { params: filter }).pipe(
      catchError(() => {
        const role = this.authService.currentRole || 'Employee';
        let scoped = [...this.mockCustomers];

        // Mirror role-scoped visibility in offline/fallback mode
        if (role === 'Employee') {
          scoped = scoped.filter(c => c.assignedEmployeeId === 'emp-3');
        } else if (role === 'Manager') {
          scoped = scoped.filter(c => c.assignedEmployeeId === 'emp-2' || c.assignedEmployeeId === 'emp-3');
        }

        if (filter?.status) {
          scoped = scoped.filter(c => c.status === filter.status);
        }
        if (filter?.search) {
          const s = filter.search.toLowerCase();
          scoped = scoped.filter(c =>
            c.companyName.toLowerCase().includes(s) ||
            (c.contactPerson && c.contactPerson.toLowerCase().includes(s)) ||
            (c.industry && c.industry.toLowerCase().includes(s))
          );
        }

        const paged: PagedResponse<Customer> = {
          success: true,
          data: scoped,
          pageNumber: 1,
          pageSize: 20,
          totalCount: scoped.length,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        };
        return of({ success: true, data: paged });
      })
    );
  }

  public getCustomerById(id: string): Observable<ApiResponse<Customer>> {
    return this.http.get<ApiResponse<Customer>>(`${this.baseUrl}/customers/${id}`).pipe(
      catchError(() => {
        const cust = this.mockCustomers.find(c => c.id === id);
        return of({ success: true, data: cust! });
      })
    );
  }

  public createCustomer(request: CreateCustomerRequest): Observable<ApiResponse<Customer>> {
    return this.http.post<ApiResponse<Customer>>(`${this.baseUrl}/customers`, request).pipe(
      catchError(() => {
        const newCust: Customer = {
          id: 'cust-' + Date.now(),
          tenantId: this.authService.getActiveTenantId() || '',
          companyName: request.companyName,
          contactPerson: request.contactPerson,
          email: request.email,
          phone: request.phone,
          website: request.website,
          industry: request.industry,
          status: request.status || 'Lead',
          assignedEmployeeId: request.assignedEmployeeId || 'emp-3',
          assignedEmployeeName: this.mockEmployees.find(e => e.id === request.assignedEmployeeId)?.fullName || 'David Lee',
          notes: request.notes,
          createdAtUtc: new Date().toISOString()
        };
        this.mockCustomers.unshift(newCust);
        return of({ success: true, data: newCust, message: 'Customer created successfully.' });
      })
    );
  }

  public updateCustomer(id: string, request: any): Observable<ApiResponse<Customer>> {
    return this.http.put<ApiResponse<Customer>>(`${this.baseUrl}/customers/${id}`, request).pipe(
      catchError(() => {
        const cust = this.mockCustomers.find(c => c.id === id);
        if (cust) {
          Object.assign(cust, request);
          cust.updatedAtUtc = new Date().toISOString();
        }
        return of({ success: true, data: cust!, message: 'Customer updated.' });
      })
    );
  }

  public deleteCustomer(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/customers/${id}`).pipe(
      catchError(() => {
        this.mockCustomers = this.mockCustomers.filter(c => c.id !== id);
        return of({ success: true, data: null, message: 'Customer deleted.' });
      })
    );
  }

  // 6. CRM Deals & Opportunities Pipeline
  public getDeals(stage?: string, customerId?: string, assignedEmployeeId?: string, search?: string): Observable<ApiResponse<PagedResponse<Deal>>> {
    let params: string[] = [];
    if (stage) params.push(`stage=${encodeURIComponent(stage)}`);
    if (customerId) params.push(`customerId=${encodeURIComponent(customerId)}`);
    if (assignedEmployeeId) params.push(`assignedEmployeeId=${encodeURIComponent(assignedEmployeeId)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';

    return this.http.get<ApiResponse<PagedResponse<Deal>>>(`${this.baseUrl}/deals${query}`).pipe(
      catchError(() => {
        let filtered = [...this.mockDeals];
        if (stage) {
          filtered = filtered.filter(d => d.stage.toLowerCase() === stage.toLowerCase());
        }
        if (customerId) {
          filtered = filtered.filter(d => d.customerId === customerId);
        }
        if (assignedEmployeeId) {
          filtered = filtered.filter(d => d.assignedEmployeeId === assignedEmployeeId);
        }
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(d => d.title.toLowerCase().includes(s) || d.customerName.toLowerCase().includes(s));
        }

        const paged: PagedResponse<Deal> = {
          success: true,
          data: filtered,
          pageNumber: 1,
          pageSize: 50,
          totalCount: filtered.length,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        };
        return of({ success: true, data: paged });
      })
    );
  }

  public getDealMetrics(): Observable<ApiResponse<DealMetrics>> {
    return this.http.get<ApiResponse<DealMetrics>>(`${this.baseUrl}/deals/metrics`).pipe(
      catchError(() => {
        const openDeals = this.mockDeals.filter(d => d.stage !== 'ClosedWon' && d.stage !== 'ClosedLost');
        const wonDeals = this.mockDeals.filter(d => d.stage === 'ClosedWon');
        const lostDeals = this.mockDeals.filter(d => d.stage === 'ClosedLost');

        const totalPipeline = openDeals.reduce((sum, d) => sum + d.amount, 0);
        const weightedPipeline = openDeals.reduce((sum, d) => sum + (d.amount * (d.probability / 100)), 0);
        const wonValue = wonDeals.reduce((sum, d) => sum + d.amount, 0);
        const lostValue = lostDeals.reduce((sum, d) => sum + d.amount, 0);

        const closedCount = wonDeals.length + lostDeals.length;
        const winRate = closedCount > 0 ? (wonDeals.length / closedCount) * 100 : 0;

        const metrics: DealMetrics = {
          totalPipelineValue: totalPipeline,
          weightedPipelineValue: weightedPipeline,
          wonValue: wonValue,
          lostValue: lostValue,
          openDealsCount: openDeals.length,
          wonDealsCount: wonDeals.length,
          lostDealsCount: lostDeals.length,
          totalDealsCount: this.mockDeals.length,
          winRatePercentage: Math.round(winRate * 10) / 10
        };
        return of({ success: true, data: metrics });
      })
    );
  }

  public getDealById(id: string): Observable<ApiResponse<Deal>> {
    return this.http.get<ApiResponse<Deal>>(`${this.baseUrl}/deals/${id}`).pipe(
      catchError(() => {
        const deal = this.mockDeals.find(d => d.id === id);
        return of({ success: true, data: deal! });
      })
    );
  }

  public createDeal(request: CreateDealRequest): Observable<ApiResponse<Deal>> {
    return this.http.post<ApiResponse<Deal>>(`${this.baseUrl}/deals`, request).pipe(
      catchError(() => {
        const cust = this.mockCustomers.find(c => c.id === request.customerId);
        const emp = this.mockEmployees.find(e => e.id === request.assignedEmployeeId);
        const defaultProb = request.stage === 'Qualified' ? 40 :
                            request.stage === 'Proposal' ? 60 :
                            request.stage === 'Negotiation' ? 80 :
                            request.stage === 'ClosedWon' ? 100 :
                            request.stage === 'ClosedLost' ? 0 : 20;

        const newDeal: Deal = {
          id: 'deal-' + Date.now(),
          tenantId: this.authService.getActiveTenantId() || '',
          title: request.title,
          customerId: request.customerId,
          customerName: cust?.companyName || 'Associated Client',
          assignedEmployeeId: request.assignedEmployeeId,
          assignedEmployeeName: emp?.fullName || 'Assigned Representative',
          amount: request.amount,
          currency: request.currency || 'USD',
          stage: request.stage || 'Lead',
          stageName: request.stage || 'Lead',
          probability: request.probability ?? defaultProb,
          expectedCloseDateUtc: request.expectedCloseDateUtc,
          closedAtUtc: request.stage === 'ClosedWon' || request.stage === 'ClosedLost' ? new Date().toISOString() : undefined,
          notes: request.notes,
          createdAtUtc: new Date().toISOString()
        };
        this.mockDeals.unshift(newDeal);
        return of({ success: true, data: newDeal, message: 'Deal opportunity created successfully.' });
      })
    );
  }

  public updateDeal(id: string, request: UpdateDealRequest): Observable<ApiResponse<Deal>> {
    return this.http.put<ApiResponse<Deal>>(`${this.baseUrl}/deals/${id}`, request).pipe(
      catchError(() => {
        const deal = this.mockDeals.find(d => d.id === id);
        if (deal) {
          const cust = this.mockCustomers.find(c => c.id === request.customerId);
          const emp = this.mockEmployees.find(e => e.id === request.assignedEmployeeId);
          deal.title = request.title;
          deal.customerId = request.customerId;
          deal.customerName = cust?.companyName || deal.customerName;
          deal.assignedEmployeeId = request.assignedEmployeeId;
          deal.assignedEmployeeName = emp?.fullName || deal.assignedEmployeeName;
          deal.amount = request.amount;
          deal.currency = request.currency || deal.currency;
          deal.stage = request.stage;
          deal.stageName = request.stage;
          deal.probability = request.probability;
          deal.expectedCloseDateUtc = request.expectedCloseDateUtc;
          deal.lostReason = request.lostReason;
          deal.notes = request.notes;
          deal.updatedAtUtc = new Date().toISOString();
          if (request.stage === 'ClosedWon' || request.stage === 'ClosedLost') {
            deal.closedAtUtc = deal.closedAtUtc || new Date().toISOString();
          } else {
            deal.closedAtUtc = undefined;
          }
        }
        return of({ success: true, data: deal!, message: 'Deal updated.' });
      })
    );
  }

  public updateDealStage(id: string, stage: DealStage, probability?: number, lostReason?: string): Observable<ApiResponse<Deal>> {
    return this.http.patch<ApiResponse<Deal>>(`${this.baseUrl}/deals/${id}/stage`, { stage, probability, lostReason }).pipe(
      catchError(() => {
        const deal = this.mockDeals.find(d => d.id === id);
        if (deal) {
          deal.stage = stage;
          deal.stageName = stage;
          if (stage === 'ClosedWon') {
            deal.probability = 100;
            deal.closedAtUtc = new Date().toISOString();
            deal.lostReason = undefined;
          } else if (stage === 'ClosedLost') {
            deal.probability = 0;
            deal.closedAtUtc = new Date().toISOString();
            deal.lostReason = lostReason || 'Marked as Lost';
          } else {
            deal.probability = probability ?? (stage === 'Qualified' ? 40 : stage === 'Proposal' ? 60 : stage === 'Negotiation' ? 80 : 20);
            deal.closedAtUtc = undefined;
            deal.lostReason = undefined;
          }
          deal.updatedAtUtc = new Date().toISOString();
        }
        return of({ success: true, data: deal!, message: `Deal stage updated to ${stage}.` });
      })
    );
  }

  public deleteDeal(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/deals/${id}`).pipe(
      catchError(() => {
        this.mockDeals = this.mockDeals.filter(d => d.id !== id);
        return of({ success: true, data: null, message: 'Deal deleted.' });
      })
    );
  }

  // 7. Customer Support & Helpdesk
  public getTickets(status?: string, priority?: string, category?: string, customerId?: string, assignedEmployeeId?: string, search?: string): Observable<ApiResponse<PagedResponse<SupportTicket>>> {
    let params: string[] = [];
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    if (priority) params.push(`priority=${encodeURIComponent(priority)}`);
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (customerId) params.push(`customerId=${encodeURIComponent(customerId)}`);
    if (assignedEmployeeId) params.push(`assignedEmployeeId=${encodeURIComponent(assignedEmployeeId)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';

    return this.http.get<ApiResponse<PagedResponse<SupportTicket>>>(`${this.baseUrl}/tickets${query}`).pipe(
      catchError(() => {
        let filtered = [...this.mockTickets];
        if (status) {
          filtered = filtered.filter(t => t.status.toLowerCase() === status.toLowerCase());
        }
        if (priority) {
          filtered = filtered.filter(t => t.priority.toLowerCase() === priority.toLowerCase());
        }
        if (category) {
          filtered = filtered.filter(t => t.category.toLowerCase() === category.toLowerCase());
        }
        if (customerId) {
          filtered = filtered.filter(t => t.customerId === customerId);
        }
        if (assignedEmployeeId) {
          filtered = filtered.filter(t => t.assignedEmployeeId === assignedEmployeeId);
        }
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(t =>
            t.ticketNumber.toLowerCase().includes(s) ||
            t.subject.toLowerCase().includes(s) ||
            t.customerName.toLowerCase().includes(s));
        }

        const paged: PagedResponse<SupportTicket> = {
          success: true,
          data: filtered,
          pageNumber: 1,
          pageSize: 50,
          totalCount: filtered.length,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        };
        return of({ success: true, data: paged });
      })
    );
  }

  public getTicketMetrics(): Observable<ApiResponse<TicketMetrics>> {
    return this.http.get<ApiResponse<TicketMetrics>>(`${this.baseUrl}/tickets/metrics`).pipe(
      catchError(() => {
        const open = this.mockTickets.filter(t => t.status === 'Open').length;
        const pending = this.mockTickets.filter(t => t.status === 'Pending').length;
        const resolved = this.mockTickets.filter(t => t.status === 'Resolved').length;
        const closed = this.mockTickets.filter(t => t.status === 'Closed').length;
        const urgent = this.mockTickets.filter(t => t.priority === 'Urgent' && t.status !== 'Closed').length;
        const total = this.mockTickets.length;
        const rate = total > 0 ? ((resolved + closed) / total) * 100 : 0;

        const metrics: TicketMetrics = {
          openTicketsCount: open,
          pendingTicketsCount: pending,
          resolvedTicketsCount: resolved,
          closedTicketsCount: closed,
          urgentTicketsCount: urgent,
          totalTicketsCount: total,
          resolutionRatePercentage: Math.round(rate * 10) / 10
        };
        return of({ success: true, data: metrics });
      })
    );
  }

  public getTicketById(id: string): Observable<ApiResponse<SupportTicket>> {
    return this.http.get<ApiResponse<SupportTicket>>(`${this.baseUrl}/tickets/${id}`).pipe(
      catchError(() => {
        const t = this.mockTickets.find(x => x.id === id);
        return of({ success: true, data: t! });
      })
    );
  }

  public createTicket(request: CreateTicketRequest): Observable<ApiResponse<SupportTicket>> {
    return this.http.post<ApiResponse<SupportTicket>>(`${this.baseUrl}/tickets`, request).pipe(
      catchError(() => {
        const cust = this.mockCustomers.find(c => c.id === request.customerId);
        const emp = this.mockEmployees.find(e => e.id === request.assignedEmployeeId);

        const newTicket: SupportTicket = {
          id: 'tck-' + Date.now(),
          tenantId: this.authService.getActiveTenantId() || '',
          ticketNumber: 'TCK-' + (this.mockTickets.length + 1001),
          subject: request.subject,
          description: request.description,
          customerId: request.customerId,
          customerName: cust?.companyName || 'Associated Client',
          assignedEmployeeId: request.assignedEmployeeId,
          assignedEmployeeName: emp?.fullName || 'Assigned Representative',
          status: 'Open',
          statusName: 'Open',
          priority: request.priority,
          priorityName: request.priority,
          category: request.category,
          categoryName: request.category,
          commentsCount: 0,
          comments: [],
          createdAtUtc: new Date().toISOString()
        };
        this.mockTickets.unshift(newTicket);
        return of({ success: true, data: newTicket, message: 'Support ticket registered.' });
      })
    );
  }

  public updateTicket(id: string, request: UpdateTicketRequest): Observable<ApiResponse<SupportTicket>> {
    return this.http.put<ApiResponse<SupportTicket>>(`${this.baseUrl}/tickets/${id}`, request).pipe(
      catchError(() => {
        const t = this.mockTickets.find(x => x.id === id);
        if (t) {
          const cust = this.mockCustomers.find(c => c.id === request.customerId);
          const emp = this.mockEmployees.find(e => e.id === request.assignedEmployeeId);
          t.subject = request.subject;
          t.description = request.description;
          t.customerId = request.customerId;
          t.customerName = cust?.companyName || t.customerName;
          t.assignedEmployeeId = request.assignedEmployeeId;
          t.assignedEmployeeName = emp?.fullName || t.assignedEmployeeName;
          t.priority = request.priority;
          t.priorityName = request.priority;
          t.category = request.category;
          t.categoryName = request.category;
          t.status = request.status;
          t.statusName = request.status;
          t.resolutionSummary = request.resolutionSummary;
          t.updatedAtUtc = new Date().toISOString();
          if (request.status === 'Resolved') {
            t.resolvedAtUtc = t.resolvedAtUtc || new Date().toISOString();
          } else if (request.status === 'Closed') {
            t.closedAtUtc = t.closedAtUtc || new Date().toISOString();
          } else {
            t.resolvedAtUtc = undefined;
            t.closedAtUtc = undefined;
          }
        }
        return of({ success: true, data: t!, message: 'Support ticket updated.' });
      })
    );
  }

  public updateTicketStatus(id: string, request: UpdateTicketStatusRequest): Observable<ApiResponse<SupportTicket>> {
    return this.http.patch<ApiResponse<SupportTicket>>(`${this.baseUrl}/tickets/${id}/status`, request).pipe(
      catchError(() => {
        const t = this.mockTickets.find(x => x.id === id);
        if (t) {
          t.status = request.status;
          t.statusName = request.status;
          t.resolutionSummary = request.resolutionSummary || t.resolutionSummary;
          t.updatedAtUtc = new Date().toISOString();
          if (request.status === 'Resolved') {
            t.resolvedAtUtc = new Date().toISOString();
          } else if (request.status === 'Closed') {
            t.closedAtUtc = new Date().toISOString();
            t.resolvedAtUtc = t.resolvedAtUtc || new Date().toISOString();
          } else {
            t.resolvedAtUtc = undefined;
            t.closedAtUtc = undefined;
          }
        }
        return of({ success: true, data: t!, message: `Ticket status updated to ${request.status}.` });
      })
    );
  }

  public addTicketComment(ticketId: string, request: AddTicketCommentRequest): Observable<ApiResponse<TicketComment>> {
    return this.http.post<ApiResponse<TicketComment>>(`${this.baseUrl}/tickets/${ticketId}/comments`, request).pipe(
      catchError(() => {
        const t = this.mockTickets.find(x => x.id === ticketId);
        const newComment: TicketComment = {
          id: 'cm-' + Date.now(),
          ticketId: ticketId,
          authorName: this.authService.currentUser?.fullName || 'Support Agent',
          commentText: request.commentText,
          isInternal: request.isInternal,
          createdAtUtc: new Date().toISOString()
        };
        if (t) {
          t.comments.push(newComment);
          t.commentsCount = t.comments.length;
          t.updatedAtUtc = new Date().toISOString();
        }
        return of({ success: true, data: newComment, message: 'Comment added.' });
      })
    );
  }

  public deleteTicket(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/tickets/${id}`).pipe(
      catchError(() => {
        this.mockTickets = this.mockTickets.filter(t => t.id !== id);
        return of({ success: true, data: null, message: 'Ticket deleted.' });
      })
    );
  }

  // 6. Inventory & Product Catalog
  public getProducts(params?: any): Observable<ApiResponse<PagedResponse<Product>>> {
    return this.http.get<ApiResponse<PagedResponse<Product>>>(`${this.baseUrl}/inventory/products`, { params }).pipe(
      catchError(() => {
        let list = [...this.mockProducts];
        if (params?.category) {
          list = list.filter(p => p.category === params.category);
        }
        if (params?.isActive !== undefined) {
          list = list.filter(p => p.isActive === (params.isActive === 'true' || params.isActive === true));
        }
        if (params?.isLowStock !== undefined) {
          list = list.filter(p => p.isLowStock === (params.isLowStock === 'true' || params.isLowStock === true));
        }
        if (params?.search) {
          const s = params.search.toLowerCase();
          list = list.filter(p => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s));
        }

        const page = params?.pageNumber ? Number(params.pageNumber) : 1;
        const pageSize = params?.pageSize ? Number(params.pageSize) : 50;
        const total = list.length;
        const data = list.slice((page - 1) * pageSize, page * pageSize);

        const paged: PagedResponse<Product> = {
          success: true,
          data,
          pageNumber: page,
          pageSize,
          totalCount: total,
          totalPages: Math.ceil(total / pageSize) || 1,
          hasPreviousPage: page > 1,
          hasNextPage: page * pageSize < total
        };

        return of({
          success: true,
          data: paged
        });
      })
    );
  }

  public getInventoryMetrics(): Observable<ApiResponse<InventoryMetrics>> {
    return this.http.get<ApiResponse<InventoryMetrics>>(`${this.baseUrl}/inventory/metrics`).pipe(
      catchError(() => {
        const totalProducts = this.mockProducts.length;
        const activeProducts = this.mockProducts.filter(p => p.isActive).length;
        const lowStock = this.mockProducts.filter(p => p.isActive && p.totalQuantityOnHand <= p.reorderLevel && p.totalQuantityOnHand > 0).length;
        const outOfStock = this.mockProducts.filter(p => p.isActive && p.totalQuantityOnHand <= 0).length;
        const valuation = this.mockProducts.reduce((sum, p) => sum + (p.totalQuantityOnHand * p.unitCost), 0);
        const units = this.mockProducts.reduce((sum, p) => sum + p.totalQuantityOnHand, 0);

        return of({
          success: true,
          data: {
            totalProductsCount: totalProducts,
            activeProductsCount: activeProducts,
            lowStockProductsCount: lowStock,
            outOfStockProductsCount: outOfStock,
            totalInventoryValuation: valuation,
            totalUnitsOnHand: units,
            recentMovementsCount: this.mockStockMovements.length
          }
        });
      })
    );
  }

  public getProductById(id: string): Observable<ApiResponse<Product>> {
    return this.http.get<ApiResponse<Product>>(`${this.baseUrl}/inventory/products/${id}`).pipe(
      catchError(() => {
        const prod = this.mockProducts.find(p => p.id === id);
        if (!prod) {
          return of({ success: false, data: null as any, message: 'Product not found.' });
        }
        return of({ success: true, data: prod });
      })
    );
  }

  public createProduct(request: CreateProductRequest): Observable<ApiResponse<Product>> {
    return this.http.post<ApiResponse<Product>>(`${this.baseUrl}/inventory/products`, request).pipe(
      catchError(() => {
        const branch = this.mockBranches.find(b => b.id === request.initialBranchId) || this.mockBranches[0];
        const newProd: Product = {
          id: 'prod-' + Date.now(),
          tenantId: '11111111-2222-3333-4444-555555555555',
          sku: request.sku.toUpperCase(),
          name: request.name,
          description: request.description,
          category: request.category,
          categoryName: request.category,
          unitOfMeasure: request.unitOfMeasure || 'pcs',
          unitPrice: request.unitPrice,
          unitCost: request.unitCost,
          reorderLevel: request.reorderLevel,
          isActive: true,
          totalQuantityOnHand: request.initialQuantity || 0,
          totalQuantityReserved: 0,
          totalQuantityAvailable: request.initialQuantity || 0,
          isLowStock: (request.initialQuantity || 0) <= request.reorderLevel,
          inventoryValuation: (request.initialQuantity || 0) * request.unitCost,
          branchInventories: [],
          createdAtUtc: new Date().toISOString()
        };

        if (request.initialQuantity && request.initialQuantity > 0 && branch) {
          const inv: ProductInventory = {
            id: 'pi-' + Date.now(),
            productId: newProd.id,
            productName: newProd.name,
            productSku: newProd.sku,
            branchId: branch.id,
            branchName: branch.name,
            branchCode: branch.code,
            quantityOnHand: request.initialQuantity,
            quantityReserved: 0,
            quantityAvailable: request.initialQuantity,
            aisleBinLocation: request.aisleBinLocation,
            isLowStock: request.initialQuantity <= newProd.reorderLevel
          };
          newProd.branchInventories.push(inv);

          this.mockStockMovements.unshift({
            id: 'mov-' + Date.now(),
            productId: newProd.id,
            productName: newProd.name,
            productSku: newProd.sku,
            branchId: branch.id,
            branchName: branch.name,
            type: 'Receipt',
            typeName: 'Receipt',
            quantity: request.initialQuantity,
            unitCost: request.unitCost,
            totalCost: request.initialQuantity * request.unitCost,
            referenceNumber: `INIT-${newProd.sku}`,
            reason: 'Initial inventory intake',
            performedByEmployeeName: this.authService.currentUser?.fullName || 'Inventory Officer',
            timestampUtc: new Date().toISOString()
          });
        }

        this.mockProducts.unshift(newProd);
        return of({ success: true, data: newProd, message: 'Product created successfully.' });
      })
    );
  }

  public updateProduct(id: string, request: UpdateProductRequest): Observable<ApiResponse<Product>> {
    return this.http.put<ApiResponse<Product>>(`${this.baseUrl}/inventory/products/${id}`, request).pipe(
      catchError(() => {
        const prod = this.mockProducts.find(p => p.id === id);
        if (prod) {
          prod.name = request.name;
          prod.description = request.description;
          prod.category = request.category;
          prod.categoryName = request.category;
          prod.unitOfMeasure = request.unitOfMeasure;
          prod.unitPrice = request.unitPrice;
          prod.unitCost = request.unitCost;
          prod.reorderLevel = request.reorderLevel;
          prod.isActive = request.isActive;
          prod.isLowStock = prod.totalQuantityOnHand <= prod.reorderLevel;
          prod.inventoryValuation = prod.totalQuantityOnHand * prod.unitCost;
          prod.updatedAtUtc = new Date().toISOString();
        }
        return of({ success: true, data: prod!, message: 'Product updated.' });
      })
    );
  }

  public deleteProduct(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/inventory/products/${id}`).pipe(
      catchError(() => {
        const prod = this.mockProducts.find(p => p.id === id);
        if (prod) {
          prod.isActive = false;
        }
        return of({ success: true, data: null, message: 'Product deactivated.' });
      })
    );
  }

  public adjustStock(request: AdjustStockRequest): Observable<ApiResponse<StockMovement>> {
    return this.http.post<ApiResponse<StockMovement>>(`${this.baseUrl}/inventory/adjust`, request).pipe(
      catchError(() => {
        const prod = this.mockProducts.find(p => p.id === request.productId);
        const sourceBranch = this.mockBranches.find(b => b.id === request.branchId) || this.mockBranches[0];
        const destBranch = request.destinationBranchId ? this.mockBranches.find(b => b.id === request.destinationBranchId) : undefined;

        if (prod) {
          let inv = prod.branchInventories.find(i => i.branchId === request.branchId);
          if (!inv) {
            inv = {
              id: 'pi-' + Date.now(),
              productId: prod.id,
              productName: prod.name,
              productSku: prod.sku,
              branchId: sourceBranch.id,
              branchName: sourceBranch.name,
              branchCode: sourceBranch.code,
              quantityOnHand: 0,
              quantityReserved: 0,
              quantityAvailable: 0,
              aisleBinLocation: request.aisleBinLocation,
              isLowStock: true
            };
            prod.branchInventories.push(inv);
          }

          if (request.type === 'Receipt' || request.type === 'AdjustmentIn') {
            inv.quantityOnHand += request.quantity;
          } else if (request.type === 'AdjustmentOut' || request.type === 'SaleShipment' || request.type === 'Scrap') {
            inv.quantityOnHand = Math.max(0, inv.quantityOnHand - request.quantity);
          } else if (request.type === 'Transfer' && destBranch) {
            inv.quantityOnHand = Math.max(0, inv.quantityOnHand - request.quantity);
            let destInv = prod.branchInventories.find(i => i.branchId === destBranch.id);
            if (!destInv) {
              destInv = {
                id: 'pi-d-' + Date.now(),
                productId: prod.id,
                productName: prod.name,
                productSku: prod.sku,
                branchId: destBranch.id,
                branchName: destBranch.name,
                branchCode: destBranch.code,
                quantityOnHand: 0,
                quantityReserved: 0,
                quantityAvailable: 0,
                isLowStock: true
              };
              prod.branchInventories.push(destInv);
            }
            destInv.quantityOnHand += request.quantity;
            destInv.quantityAvailable = destInv.quantityOnHand - destInv.quantityReserved;
            destInv.isLowStock = destInv.quantityOnHand <= prod.reorderLevel;
          }

          inv.quantityAvailable = inv.quantityOnHand - inv.quantityReserved;
          inv.isLowStock = inv.quantityOnHand <= prod.reorderLevel;

          prod.totalQuantityOnHand = prod.branchInventories.reduce((sum, i) => sum + i.quantityOnHand, 0);
          prod.totalQuantityAvailable = prod.totalQuantityOnHand - prod.totalQuantityReserved;
          prod.isLowStock = prod.totalQuantityOnHand <= prod.reorderLevel;
          prod.inventoryValuation = prod.totalQuantityOnHand * prod.unitCost;
        }

        const movement: StockMovement = {
          id: 'mov-' + Date.now(),
          productId: request.productId,
          productName: prod?.name || 'Product',
          productSku: prod?.sku || 'SKU',
          branchId: sourceBranch.id,
          branchName: sourceBranch.name,
          destinationBranchId: destBranch?.id,
          destinationBranchName: destBranch?.name,
          type: request.type,
          typeName: request.type,
          quantity: request.quantity,
          unitCost: request.unitCost ?? prod?.unitCost,
          totalCost: request.quantity * (request.unitCost ?? prod?.unitCost ?? 0),
          referenceNumber: request.referenceNumber,
          reason: request.reason,
          performedByEmployeeName: this.authService.currentUser?.fullName || 'Inventory Officer',
          timestampUtc: new Date().toISOString()
        };

        this.mockStockMovements.unshift(movement);
        return of({ success: true, data: movement, message: `Stock adjusted: ${request.type} (${request.quantity}).` });
      })
    );
  }

  public getStockMovements(params?: any): Observable<ApiResponse<PagedResponse<StockMovement>>> {
    return this.http.get<ApiResponse<PagedResponse<StockMovement>>>(`${this.baseUrl}/inventory/movements`, { params }).pipe(
      catchError(() => {
        let list = [...this.mockStockMovements];
        if (params?.productId) {
          list = list.filter(m => m.productId === params.productId);
        }
        if (params?.branchId) {
          list = list.filter(m => m.branchId === params.branchId || m.destinationBranchId === params.branchId);
        }
        if (params?.type) {
          list = list.filter(m => m.type === params.type);
        }
        if (params?.search) {
          const s = params.search.toLowerCase();
          list = list.filter(m =>
            m.productName.toLowerCase().includes(s) ||
            m.productSku.toLowerCase().includes(s) ||
            (m.referenceNumber && m.referenceNumber.toLowerCase().includes(s))
          );
        }

        const page = params?.pageNumber ? Number(params.pageNumber) : 1;
        const pageSize = params?.pageSize ? Number(params.pageSize) : 50;
        const total = list.length;
        const data = list.slice((page - 1) * pageSize, page * pageSize);

        const paged: PagedResponse<StockMovement> = {
          success: true,
          data,
          pageNumber: page,
          pageSize,
          totalCount: total,
          totalPages: Math.ceil(total / pageSize) || 1,
          hasPreviousPage: page > 1,
          hasNextPage: page * pageSize < total
        };

        return of({
          success: true,
          data: paged
        });
      })
    );
  }

  public getProductLocations(productId: string): Observable<ApiResponse<ProductInventory[]>> {
    return this.http.get<ApiResponse<ProductInventory[]>>(`${this.baseUrl}/inventory/products/${productId}/locations`).pipe(
      catchError(() => {
        const prod = this.mockProducts.find(p => p.id === productId);
        return of({ success: true, data: prod?.branchInventories || [] });
      })
    );
  }

  // 7. Invoicing & Financial Accounting
  public getInvoices(params?: any): Observable<ApiResponse<PagedResponse<Invoice>>> {
    return this.http.get<ApiResponse<PagedResponse<Invoice>>>(`${this.baseUrl}/finance/invoices`, { params }).pipe(
      catchError(() => {
        let list = [...this.mockInvoices];

        if (params?.status) {
          list = list.filter(i => i.status === params.status);
        }
        if (params?.customerId) {
          list = list.filter(i => i.customerId === params.customerId);
        }
        if (params?.isOverdue !== undefined) {
          list = list.filter(i => i.isOverdue === (params.isOverdue === 'true' || params.isOverdue === true));
        }
        if (params?.search) {
          const s = params.search.toLowerCase();
          list = list.filter(i =>
            i.invoiceNumber.toLowerCase().includes(s) ||
            i.customerName.toLowerCase().includes(s) ||
            (i.notes && i.notes.toLowerCase().includes(s))
          );
        }

        const page = params?.pageNumber ? Number(params.pageNumber) : 1;
        const pageSize = params?.pageSize ? Number(params.pageSize) : 50;
        const total = list.length;
        const data = list.slice((page - 1) * pageSize, page * pageSize);

        const paged: PagedResponse<Invoice> = {
          success: true,
          data,
          pageNumber: page,
          pageSize,
          totalCount: total,
          totalPages: Math.ceil(total / pageSize) || 1,
          hasPreviousPage: page > 1,
          hasNextPage: page * pageSize < total
        };

        return of({ success: true, data: paged });
      })
    );
  }

  public getFinancialMetrics(): Observable<ApiResponse<FinancialMetrics>> {
    return this.http.get<ApiResponse<FinancialMetrics>>(`${this.baseUrl}/finance/invoices/metrics`).pipe(
      catchError(() => {
        const billable = this.mockInvoices.filter(i => i.status !== 'Draft' && i.status !== 'Void');
        const totalInvoiced = billable.reduce((sum, i) => sum + i.totalAmount, 0);
        const totalCollected = this.mockInvoices.filter(i => i.status !== 'Void').reduce((sum, i) => sum + i.amountPaid, 0);
        const totalOutstanding = billable.reduce((sum, i) => sum + i.balanceDue, 0);
        const totalOverdue = billable.filter(i => i.isOverdue).reduce((sum, i) => sum + i.balanceDue, 0);

        const metrics: FinancialMetrics = {
          totalInvoicedAmount: totalInvoiced,
          totalCollectedAmount: totalCollected,
          totalOutstandingAmount: totalOutstanding,
          totalOverdueAmount: totalOverdue,
          totalInvoicesCount: this.mockInvoices.length,
          draftInvoicesCount: this.mockInvoices.filter(i => i.status === 'Draft').length,
          issuedInvoicesCount: this.mockInvoices.filter(i => i.status === 'Issued').length,
          partiallyPaidInvoicesCount: this.mockInvoices.filter(i => i.status === 'PartiallyPaid').length,
          paidInvoicesCount: this.mockInvoices.filter(i => i.status === 'Paid').length,
          collectionRatePercentage: totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 1000) / 10 : 0
        };

        return of({ success: true, data: metrics });
      })
    );
  }

  public getInvoiceById(id: string): Observable<ApiResponse<Invoice>> {
    return this.http.get<ApiResponse<Invoice>>(`${this.baseUrl}/finance/invoices/${id}`).pipe(
      catchError(() => {
        const inv = this.mockInvoices.find(i => i.id === id);
        if (!inv) {
          return of({ success: false, data: null as any, message: 'Invoice not found.' });
        }
        return of({ success: true, data: inv });
      })
    );
  }

  public createInvoice(request: CreateInvoiceRequest): Observable<ApiResponse<Invoice>> {
    return this.http.post<ApiResponse<Invoice>>(`${this.baseUrl}/finance/invoices`, request).pipe(
      catchError(() => {
        const customer = this.mockCustomers.find(c => c.id === request.customerId) || this.mockCustomers[0];
        const count = this.mockInvoices.length + 1;
        const invNumber = `INV-2026-${count.toString().padStart(4, '0')}`;

        let subtotal = 0;
        const items: InvoiceItem[] = (request.items || []).map((reqItem, idx) => {
          const prod = this.mockProducts.find(p => p.id === reqItem.productId);
          const total = Math.round(reqItem.quantity * reqItem.unitPrice * 100) / 100;
          const tax = Math.round(total * (request.taxRate / 100) * 100) / 100;
          subtotal += total;
          return {
            id: `item-${Date.now()}-${idx}`,
            invoiceId: `inv-${Date.now()}`,
            productId: reqItem.productId,
            productSku: prod?.sku,
            productName: prod?.name,
            description: reqItem.description,
            quantity: reqItem.quantity,
            unitPrice: reqItem.unitPrice,
            taxAmount: tax,
            totalAmount: total
          };
        });

        const taxable = Math.max(0, subtotal - (request.discountAmount || 0));
        const taxAmount = Math.round(taxable * (request.taxRate / 100) * 100) / 100;
        const totalAmount = Math.max(0, taxable + taxAmount);

        const newInvoice: Invoice = {
          id: `inv-${Date.now()}`,
          tenantId: '11111111-2222-3333-4444-555555555555',
          invoiceNumber: invNumber,
          customerId: customer.id,
          customerName: customer.companyName,
          customerEmail: customer.email,
          dealId: request.dealId,
          issueDateUtc: request.issueDateUtc || new Date().toISOString(),
          dueDateUtc: request.dueDateUtc || new Date(Date.now() + 30 * 86400000).toISOString(),
          status: 'Draft',
          statusName: 'Draft',
          currency: request.currency || 'USD',
          subtotal,
          taxRate: request.taxRate,
          taxAmount,
          discountAmount: request.discountAmount || 0,
          totalAmount,
          amountPaid: 0,
          balanceDue: totalAmount,
          isOverdue: false,
          notes: request.notes,
          termsAndConditions: request.termsAndConditions || 'Net 30 days.',
          items,
          payments: [],
          createdAtUtc: new Date().toISOString()
        };

        this.mockInvoices.unshift(newInvoice);
        return of({ success: true, data: newInvoice, message: 'Draft invoice created.' });
      })
    );
  }

  public updateInvoice(id: string, request: UpdateInvoiceRequest): Observable<ApiResponse<Invoice>> {
    return this.http.put<ApiResponse<Invoice>>(`${this.baseUrl}/finance/invoices/${id}`, request).pipe(
      catchError(() => {
        const inv = this.mockInvoices.find(i => i.id === id);
        if (inv) {
          const customer = this.mockCustomers.find(c => c.id === request.customerId);
          if (customer) {
            inv.customerId = customer.id;
            inv.customerName = customer.companyName;
            inv.customerEmail = customer.email;
          }
          inv.dealId = request.dealId;
          inv.dueDateUtc = request.dueDateUtc;
          inv.taxRate = request.taxRate;
          inv.discountAmount = request.discountAmount;
          inv.notes = request.notes;
          inv.termsAndConditions = request.termsAndConditions;

          let subtotal = 0;
          inv.items = (request.items || []).map((reqItem, idx) => {
            const prod = this.mockProducts.find(p => p.id === reqItem.productId);
            const total = Math.round(reqItem.quantity * reqItem.unitPrice * 100) / 100;
            const tax = Math.round(total * (request.taxRate / 100) * 100) / 100;
            subtotal += total;
            return {
              id: `item-${Date.now()}-${idx}`,
              invoiceId: inv.id,
              productId: reqItem.productId,
              productSku: prod?.sku,
              productName: prod?.name,
              description: reqItem.description,
              quantity: reqItem.quantity,
              unitPrice: reqItem.unitPrice,
              taxAmount: tax,
              totalAmount: total
            };
          });

          inv.subtotal = subtotal;
          const taxable = Math.max(0, subtotal - inv.discountAmount);
          inv.taxAmount = Math.round(taxable * (inv.taxRate / 100) * 100) / 100;
          inv.totalAmount = Math.max(0, taxable + inv.taxAmount);
          inv.balanceDue = Math.max(0, inv.totalAmount - inv.amountPaid);
          inv.updatedAtUtc = new Date().toISOString();
        }
        return of({ success: true, data: inv!, message: 'Invoice updated.' });
      })
    );
  }

  public issueInvoice(id: string): Observable<ApiResponse<Invoice>> {
    return this.http.post<ApiResponse<Invoice>>(`${this.baseUrl}/finance/invoices/${id}/issue`, {}).pipe(
      catchError(() => {
        const inv = this.mockInvoices.find(i => i.id === id);
        if (inv) {
          inv.status = 'Issued';
          inv.statusName = 'Issued';
          inv.issueDateUtc = new Date().toISOString();
          inv.updatedAtUtc = new Date().toISOString();
        }
        return of({ success: true, data: inv!, message: 'Invoice issued to client.' });
      })
    );
  }

  public voidInvoice(id: string): Observable<ApiResponse<Invoice>> {
    return this.http.post<ApiResponse<Invoice>>(`${this.baseUrl}/finance/invoices/${id}/void`, {}).pipe(
      catchError(() => {
        const inv = this.mockInvoices.find(i => i.id === id);
        if (inv) {
          inv.status = 'Void';
          inv.statusName = 'Void';
          inv.updatedAtUtc = new Date().toISOString();
        }
        return of({ success: true, data: inv!, message: 'Invoice voided.' });
      })
    );
  }

  public recordPayment(invoiceId: string, request: RecordPaymentRequest): Observable<ApiResponse<PaymentRecord>> {
    return this.http.post<ApiResponse<PaymentRecord>>(`${this.baseUrl}/finance/invoices/${invoiceId}/payments`, request).pipe(
      catchError(() => {
        const inv = this.mockInvoices.find(i => i.id === invoiceId);
        const payCount = (inv?.payments.length || 0) + 1;
        const newPayment: PaymentRecord = {
          id: `pay-${Date.now()}`,
          invoiceId,
          paymentNumber: `PAY-2026-${payCount.toString().padStart(4, '0')}`,
          amount: request.amount,
          paymentDateUtc: request.paymentDateUtc || new Date().toISOString(),
          method: request.method,
          methodName: request.method,
          referenceNumber: request.referenceNumber,
          notes: request.notes,
          recordedByEmployeeName: this.authService.currentUser?.fullName || 'Finance Officer'
        };

        if (inv) {
          inv.payments.unshift(newPayment);
          inv.amountPaid += request.amount;
          inv.balanceDue = Math.max(0, inv.totalAmount - inv.amountPaid);
          if (inv.amountPaid >= inv.totalAmount) {
            inv.status = 'Paid';
            inv.statusName = 'Paid';
            inv.paidAtUtc = new Date().toISOString();
          } else {
            inv.status = 'PartiallyPaid';
            inv.statusName = 'PartiallyPaid';
          }
          inv.updatedAtUtc = new Date().toISOString();
        }

        return of({ success: true, data: newPayment, message: 'Payment recorded.' });
      })
    );
  }

  public deleteInvoice(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/finance/invoices/${id}`).pipe(
      catchError(() => {
        this.mockInvoices = this.mockInvoices.filter(i => i.id !== id);
        return of({ success: true, data: null, message: 'Invoice deleted.' });
      })
    );
  }

  // ==========================================
  // MANUFACTURING & PRODUCTION STATE & METHODS
  // ==========================================

  private mockWorkOrders: WorkOrder[] = [
    {
      id: 'wo-1',
      tenantId: '11111111-2222-3333-4444-555555555555',
      orderNumber: 'WO-2026-0001',
      productId: 'prod-1',
      productSku: 'GW-TITAN-X1',
      productName: 'Titan Enterprise IoT Gateway',
      branchId: 'br-1',
      branchName: 'Global Headquarters',
      assignedEmployeeId: 'emp-2',
      assignedEmployeeName: 'Sarah Jenkins',
      quantityTarget: 50,
      quantityProduced: 50,
      progressPercentage: 100,
      status: 'Completed',
      statusName: 'Completed',
      priority: 'High',
      priorityName: 'High',
      startDateUtc: '2026-10-01T08:00:00Z',
      dueDateUtc: '2026-10-10T17:00:00Z',
      completedDateUtc: '2026-10-09T15:30:00Z',
      isOverdue: false,
      notes: 'Initial production run of rev 2.1 boards',
      createdAtUtc: '2026-10-01T07:30:00Z'
    },
    {
      id: 'wo-2',
      tenantId: '11111111-2222-3333-4444-555555555555',
      orderNumber: 'WO-2026-0002',
      productId: 'prod-2',
      productSku: 'SEN-VIBE-PRO',
      productName: 'Precision Industrial Vibration Sensor',
      branchId: 'br-1',
      branchName: 'Global Headquarters',
      assignedEmployeeId: 'emp-3',
      assignedEmployeeName: 'David Lee',
      quantityTarget: 100,
      quantityProduced: 45,
      progressPercentage: 45,
      status: 'InProgress',
      statusName: 'InProgress',
      priority: 'Medium',
      priorityName: 'Medium',
      startDateUtc: '2026-10-11T09:00:00Z',
      dueDateUtc: '2026-10-22T17:00:00Z',
      isOverdue: false,
      notes: 'SMT placement completed; testing in progress',
      createdAtUtc: '2026-10-10T10:00:00Z'
    },
    {
      id: 'wo-3',
      tenantId: '11111111-2222-3333-4444-555555555555',
      orderNumber: 'WO-2026-0003',
      productId: 'prod-1',
      productSku: 'GW-TITAN-X1',
      productName: 'Titan Enterprise IoT Gateway',
      branchId: 'br-2',
      branchName: 'EMEA Logistics Hub',
      assignedEmployeeId: 'emp-2',
      assignedEmployeeName: 'Sarah Jenkins',
      quantityTarget: 30,
      quantityProduced: 0,
      progressPercentage: 0,
      status: 'Planned',
      statusName: 'Planned',
      priority: 'Urgent',
      priorityName: 'Urgent',
      startDateUtc: '2026-10-18T08:00:00Z',
      dueDateUtc: '2026-10-25T17:00:00Z',
      isOverdue: false,
      notes: 'Scheduled for EMEA expansion stock',
      createdAtUtc: '2026-10-14T11:00:00Z'
    }
  ];

  private mockBoms: BillOfMaterials[] = [
    {
      id: 'bom-1',
      tenantId: '11111111-2222-3333-4444-555555555555',
      bomNumber: 'BOM-0001',
      name: 'Titan IoT Gateway Assembly Recipe',
      description: 'Master BOM for industrial grade wireless gateway',
      productId: 'prod-1',
      productSku: 'GW-TITAN-X1',
      productName: 'Titan Enterprise IoT Gateway',
      version: 'v2.1',
      isActive: true,
      items: [
        {
          id: 'bomi-1',
          billOfMaterialsId: 'bom-1',
          componentProductId: 'prod-2',
          componentProductSku: 'SEN-VIBE-PRO',
          componentProductName: 'Precision Industrial Vibration Sensor',
          quantityRequired: 2,
          unitOfMeasure: 'pcs',
          notes: 'Sensor submodule'
        }
      ],
      createdAtUtc: '2026-09-15T10:00:00Z'
    }
  ];

  public getWorkOrders(status?: string, priority?: string, branchId?: string, search?: string): Observable<ApiResponse<PagedResponse<WorkOrder>>> {
    let params: any = {};
    if (status) params.status = status;
    if (priority) params.priority = priority;
    if (branchId) params.branchId = branchId;
    if (search) params.search = search;

    return this.http.get<ApiResponse<PagedResponse<WorkOrder>>>(`${this.baseUrl}/manufacturing/work-orders`, { params }).pipe(
      catchError(() => {
        let filtered = [...this.mockWorkOrders];
        if (status) filtered = filtered.filter(w => w.status === status);
        if (priority) filtered = filtered.filter(w => w.priority === priority);
        if (branchId) filtered = filtered.filter(w => w.branchId === branchId);
        if (search) {
          const q = search.toLowerCase();
          filtered = filtered.filter(w =>
            w.orderNumber.toLowerCase().includes(q) ||
            w.productName.toLowerCase().includes(q) ||
            w.productSku.toLowerCase().includes(q)
          );
        }

        const paged: PagedResponse<WorkOrder> = {
          success: true,
          data: filtered,
          pageNumber: 1,
          pageSize: 20,
          totalCount: filtered.length,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        };
        return of({ success: true, data: paged });
      })
    );
  }

  public getManufacturingMetrics(): Observable<ApiResponse<ManufacturingMetrics>> {
    return this.http.get<ApiResponse<ManufacturingMetrics>>(`${this.baseUrl}/manufacturing/metrics`).pipe(
      catchError(() => {
        const metrics: ManufacturingMetrics = {
          totalWorkOrders: this.mockWorkOrders.length,
          draftCount: this.mockWorkOrders.filter(w => w.status === 'Draft').length,
          plannedCount: this.mockWorkOrders.filter(w => w.status === 'Planned').length,
          inProgressCount: this.mockWorkOrders.filter(w => w.status === 'InProgress').length,
          completedCount: this.mockWorkOrders.filter(w => w.status === 'Completed').length,
          cancelledCount: this.mockWorkOrders.filter(w => w.status === 'Cancelled').length,
          totalUnitsTarget: this.mockWorkOrders.reduce((s, w) => s + w.quantityTarget, 0),
          totalUnitsProduced: this.mockWorkOrders.reduce((s, w) => s + w.quantityProduced, 0),
          completionRate: this.mockWorkOrders.length > 0
            ? Math.round((this.mockWorkOrders.filter(w => w.status === 'Completed').length / this.mockWorkOrders.length) * 100)
            : 0
        };
        return of({ success: true, data: metrics });
      })
    );
  }

  public getWorkOrderById(id: string): Observable<ApiResponse<WorkOrder>> {
    return this.http.get<ApiResponse<WorkOrder>>(`${this.baseUrl}/manufacturing/work-orders/${id}`).pipe(
      catchError(() => {
        const wo = this.mockWorkOrders.find(w => w.id === id);
        return of({ success: !!wo, data: wo! });
      })
    );
  }

  public createWorkOrder(request: CreateWorkOrderRequest): Observable<ApiResponse<WorkOrder>> {
    return this.http.post<ApiResponse<WorkOrder>>(`${this.baseUrl}/manufacturing/work-orders`, request).pipe(
      catchError(() => {
        const product = this.mockProducts.find(p => p.id === request.productId);
        const branch = this.mockBranches.find(b => b.id === request.branchId);
        const employee = this.mockEmployees.find(e => e.id === request.assignedEmployeeId);
        const num = `WO-${new Date().getFullYear()}-${String(this.mockWorkOrders.length + 1).padStart(4, '0')}`;

        const newWo: WorkOrder = {
          id: `wo-${Date.now()}`,
          tenantId: '11111111-2222-3333-4444-555555555555',
          orderNumber: num,
          productId: request.productId,
          productSku: product?.sku || 'SKU-NEW',
          productName: product?.name || 'Manufactured Item',
          branchId: request.branchId,
          branchName: branch?.name || 'Production Plant',
          assignedEmployeeId: request.assignedEmployeeId,
          assignedEmployeeName: employee?.fullName,
          quantityTarget: request.quantityTarget,
          quantityProduced: 0,
          progressPercentage: 0,
          status: 'Draft',
          statusName: 'Draft',
          priority: request.priority,
          priorityName: request.priority,
          startDateUtc: request.startDateUtc,
          dueDateUtc: request.dueDateUtc,
          isOverdue: false,
          notes: request.notes,
          createdAtUtc: new Date().toISOString()
        };

        this.mockWorkOrders.unshift(newWo);
        return of({ success: true, data: newWo, message: 'Work order created.' });
      })
    );
  }

  public updateWorkOrder(id: string, request: UpdateWorkOrderRequest): Observable<ApiResponse<WorkOrder>> {
    return this.http.put<ApiResponse<WorkOrder>>(`${this.baseUrl}/manufacturing/work-orders/${id}`, request).pipe(
      catchError(() => {
        const wo = this.mockWorkOrders.find(w => w.id === id);
        if (wo) {
          const branch = this.mockBranches.find(b => b.id === request.branchId);
          const emp = this.mockEmployees.find(e => e.id === request.assignedEmployeeId);
          wo.branchId = request.branchId;
          wo.branchName = branch?.name || wo.branchName;
          wo.assignedEmployeeId = request.assignedEmployeeId;
          wo.assignedEmployeeName = emp?.fullName;
          wo.quantityTarget = request.quantityTarget;
          wo.priority = request.priority;
          wo.priorityName = request.priority;
          wo.startDateUtc = request.startDateUtc;
          wo.dueDateUtc = request.dueDateUtc;
          wo.notes = request.notes;
          wo.updatedAtUtc = new Date().toISOString();
        }
        return of({ success: true, data: wo!, message: 'Work order updated.' });
      })
    );
  }

  public updateWorkOrderStatus(id: string, request: UpdateWorkOrderStatusRequest): Observable<ApiResponse<WorkOrder>> {
    return this.http.patch<ApiResponse<WorkOrder>>(`${this.baseUrl}/manufacturing/work-orders/${id}/status`, request).pipe(
      catchError(() => {
        const wo = this.mockWorkOrders.find(w => w.id === id);
        if (wo) {
          wo.status = request.status;
          wo.statusName = request.status;
          if (request.status === 'InProgress' && !wo.startDateUtc) {
            wo.startDateUtc = new Date().toISOString();
          }
          if (request.status === 'Completed') {
            wo.completedDateUtc = new Date().toISOString();
            wo.quantityProduced = request.quantityProduced ?? wo.quantityTarget;
            wo.progressPercentage = 100;
          } else if (request.quantityProduced !== undefined) {
            wo.quantityProduced = request.quantityProduced;
            wo.progressPercentage = wo.quantityTarget > 0 ? Math.min(100, Math.round((wo.quantityProduced / wo.quantityTarget) * 100)) : 0;
          }
          if (request.notes) wo.notes = request.notes;
          wo.updatedAtUtc = new Date().toISOString();
        }
        return of({ success: true, data: wo!, message: 'Status updated.' });
      })
    );
  }

  public deleteWorkOrder(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/manufacturing/work-orders/${id}`).pipe(
      catchError(() => {
        this.mockWorkOrders = this.mockWorkOrders.filter(w => w.id !== id);
        return of({ success: true, data: null, message: 'Work order deleted.' });
      })
    );
  }

  public getBillsOfMaterials(): Observable<ApiResponse<BillOfMaterials[]>> {
    return this.http.get<ApiResponse<BillOfMaterials[]>>(`${this.baseUrl}/manufacturing/boms`).pipe(
      catchError(() => {
        return of({ success: true, data: this.mockBoms });
      })
    );
  }

  public getBomById(id: string): Observable<ApiResponse<BillOfMaterials>> {
    return this.http.get<ApiResponse<BillOfMaterials>>(`${this.baseUrl}/manufacturing/boms/${id}`).pipe(
      catchError(() => {
        const bom = this.mockBoms.find(b => b.id === id);
        return of({ success: !!bom, data: bom! });
      })
    );
  }

  public createBom(request: CreateBomRequest): Observable<ApiResponse<BillOfMaterials>> {
    return this.http.post<ApiResponse<BillOfMaterials>>(`${this.baseUrl}/manufacturing/boms`, request).pipe(
      catchError(() => {
        const product = this.mockProducts.find(p => p.id === request.productId);
        const bomNum = `BOM-${String(this.mockBoms.length + 1).padStart(4, '0')}`;

        const newBom: BillOfMaterials = {
          id: `bom-${Date.now()}`,
          tenantId: '11111111-2222-3333-4444-555555555555',
          bomNumber: bomNum,
          name: request.name,
          description: request.description,
          productId: request.productId,
          productSku: product?.sku || 'SKU-BOM',
          productName: product?.name || 'Assembled Good',
          version: request.version || 'v1.0',
          isActive: true,
          items: request.items.map((i: any, idx: number) => {
            const comp = this.mockProducts.find(p => p.id === i.componentProductId);
            return {
              id: `bomi-${idx + 1}`,
              billOfMaterialsId: `bom-${Date.now()}`,
              componentProductId: i.componentProductId,
              componentProductSku: comp?.sku || 'SKU-COMP',
              componentProductName: comp?.name || 'Raw Component',
              quantityRequired: i.quantityRequired,
              unitOfMeasure: i.unitOfMeasure,
              notes: i.notes
            };
          }),
          createdAtUtc: new Date().toISOString()
        };

        this.mockBoms.unshift(newBom);
        return of({ success: true, data: newBom, message: 'BOM created.' });
      })
    );
  }

  // ==========================================
  // HR & ATTENDANCE MANAGEMENT
  // ==========================================

  private mockLeaveRequests: LeaveRequest[] = [
    {
      id: 'lr-1',
      requestNumber: 'LR-2026-0001',
      employeeId: 'emp-3',
      employeeName: 'David Lee',
      employeeNumber: 'EMP-003',
      departmentName: 'Operations & Logistics',
      leaveType: 'Annual',
      startDateUtc: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      endDateUtc: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      daysCount: 3,
      reason: 'Annual family holiday trip.',
      status: 'Approved',
      approverEmployeeId: 'emp-2',
      approverEmployeeName: 'Sarah Jenkins',
      actionedAtUtc: new Date(Date.now() - 86400000).toISOString(),
      createdAtUtc: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'lr-2',
      requestNumber: 'LR-2026-0002',
      employeeId: 'emp-2',
      employeeName: 'Sarah Jenkins',
      employeeNumber: 'EMP-002',
      departmentName: 'Operations & Logistics',
      leaveType: 'Sick',
      startDateUtc: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
      endDateUtc: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
      daysCount: 1,
      reason: 'Medical checkup and dental treatment.',
      status: 'Approved',
      approverEmployeeId: 'emp-1',
      approverEmployeeName: 'Alex Morgan',
      actionedAtUtc: new Date(Date.now() - 86400000 * 4).toISOString(),
      createdAtUtc: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
      id: 'lr-3',
      requestNumber: 'LR-2026-0003',
      employeeId: 'emp-3',
      employeeName: 'David Lee',
      employeeNumber: 'EMP-003',
      departmentName: 'Operations & Logistics',
      leaveType: 'Compensatory',
      startDateUtc: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
      endDateUtc: new Date(Date.now() + 86400000 * 11).toISOString().split('T')[0],
      daysCount: 2,
      reason: 'Compensatory time-off for weekend facility maintenance migration.',
      status: 'Pending',
      createdAtUtc: new Date().toISOString()
    }
  ];

  private mockAttendanceLogs: AttendanceLog[] = [
    {
      id: 'att-1',
      employeeId: 'emp-1',
      employeeName: 'Alex Morgan',
      employeeNumber: 'EMP-001',
      departmentName: 'Executive Leadership',
      date: new Date().toISOString().split('T')[0],
      checkInTimeUtc: new Date(new Date().setHours(8, 45, 0, 0)).toISOString(),
      checkOutTimeUtc: undefined,
      totalHours: undefined,
      status: 'Present',
      workLocation: 'HQ - Executive Office',
      notes: 'Morning board sync attended.',
      createdAtUtc: new Date().toISOString()
    },
    {
      id: 'att-2',
      employeeId: 'emp-2',
      employeeName: 'Sarah Jenkins',
      employeeNumber: 'EMP-002',
      departmentName: 'Operations & Logistics',
      date: new Date().toISOString().split('T')[0],
      checkInTimeUtc: new Date(new Date().setHours(8, 55, 0, 0)).toISOString(),
      checkOutTimeUtc: undefined,
      totalHours: undefined,
      status: 'Present',
      workLocation: 'HQ - Operations Floor',
      notes: 'Supervising inventory count.',
      createdAtUtc: new Date().toISOString()
    },
    {
      id: 'att-3',
      employeeId: 'emp-3',
      employeeName: 'David Lee',
      employeeNumber: 'EMP-003',
      departmentName: 'Operations & Logistics',
      date: new Date().toISOString().split('T')[0],
      checkInTimeUtc: new Date(new Date().setHours(9, 10, 0, 0)).toISOString(),
      checkOutTimeUtc: undefined,
      totalHours: undefined,
      status: 'Present',
      workLocation: 'HQ - Warehouse Dispatch',
      notes: 'Logistics coordination active.',
      createdAtUtc: new Date().toISOString()
    }
  ];

  private mockShiftSchedules: ShiftSchedule[] = [
    {
      id: 'sh-1',
      employeeId: 'emp-3',
      employeeName: 'David Lee',
      employeeNumber: 'EMP-003',
      shiftName: 'Standard Operations Day Shift',
      shiftType: 'StandardDay',
      startTime: '09:00:00',
      endTime: '17:30:00',
      effectiveFromUtc: '2026-01-01',
      isActive: true,
      notes: 'Standard 40-hour weekly rota with 30m break.',
      createdAtUtc: '2026-01-01T00:00:00Z'
    },
    {
      id: 'sh-2',
      employeeId: 'emp-2',
      employeeName: 'Sarah Jenkins',
      employeeNumber: 'EMP-002',
      shiftName: 'Operations Leadership Staggered Shift',
      shiftType: 'Flexible',
      startTime: '08:30:00',
      endTime: '17:00:00',
      effectiveFromUtc: '2026-01-01',
      isActive: true,
      notes: 'Early floor walk supervision.',
      createdAtUtc: '2026-01-01T00:00:00Z'
    },
    {
      id: 'sh-3',
      employeeId: 'emp-1',
      employeeName: 'Alex Morgan',
      employeeNumber: 'EMP-001',
      shiftName: 'Executive Core Hours',
      shiftType: 'Flexible',
      startTime: '08:00:00',
      endTime: '18:00:00',
      effectiveFromUtc: '2026-01-01',
      isActive: true,
      notes: 'Executive leadership oversight.',
      createdAtUtc: '2026-01-01T00:00:00Z'
    }
  ];

  public getHrMetrics(): Observable<ApiResponse<HrMetrics>> {
    return this.http.get<ApiResponse<HrMetrics>>(`${this.baseUrl}/hr/metrics`).pipe(
      catchError(() => {
        const total = this.mockEmployees.length;
        const present = this.mockAttendanceLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        const pending = this.mockLeaveRequests.filter(r => r.status === 'Pending').length;

        const metrics: HrMetrics = {
          totalEmployees: total,
          presentToday: present,
          attendanceRatePercent: rate,
          onLeaveToday: 0,
          lateToday: 0,
          pendingLeaveRequests: pending,
          approvedLeaveDaysThisMonth: 4
        };

        return of({ success: true, data: metrics });
      })
    );
  }

  public getLeaveRequests(filter?: LeaveRequestFilter): Observable<ApiResponse<PagedResponse<LeaveRequest>>> {
    return this.http.get<ApiResponse<PagedResponse<LeaveRequest>>>(`${this.baseUrl}/hr/leaves`, { params: filter as any }).pipe(
      catchError(() => {
        let list = [...this.mockLeaveRequests];
        if (filter?.status) {
          list = list.filter(r => r.status === filter.status);
        }
        if (filter?.leaveType) {
          list = list.filter(r => r.leaveType === filter.leaveType);
        }
        if (filter?.employeeId) {
          list = list.filter(r => r.employeeId === filter.employeeId);
        }

        const res: PagedResponse<LeaveRequest> = {
          success: true,
          data: list,
          totalCount: list.length,
          pageNumber: filter?.page || 1,
          pageSize: filter?.pageSize || 20,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        };

        return of({ success: true, data: res });
      })
    );
  }

  public getLeaveRequest(id: string): Observable<ApiResponse<LeaveRequest>> {
    return this.http.get<ApiResponse<LeaveRequest>>(`${this.baseUrl}/hr/leaves/${id}`).pipe(
      catchError(() => {
        const item = this.mockLeaveRequests.find(r => r.id === id);
        return of({ success: !!item, data: item! });
      })
    );
  }

  public submitLeaveRequest(request: CreateLeaveRequestRequest): Observable<ApiResponse<LeaveRequest>> {
    return this.http.post<ApiResponse<LeaveRequest>>(`${this.baseUrl}/hr/leaves`, request).pipe(
      catchError(() => {
        const emp = this.mockEmployees.find(e => e.id === request.employeeId) || this.mockEmployees[2];
        const days = request.daysCount || 3;
        const reqNum = `LR-${new Date().getFullYear()}-${String(this.mockLeaveRequests.length + 1).padStart(4, '0')}`;

        const newLeave: LeaveRequest = {
          id: `lr-${Date.now()}`,
          requestNumber: reqNum,
          employeeId: emp.id,
          employeeName: emp.fullName,
          employeeNumber: emp.employeeNumber,
          departmentName: emp.departmentName || 'General',
          leaveType: request.leaveType,
          startDateUtc: request.startDateUtc,
          endDateUtc: request.endDateUtc,
          daysCount: days,
          reason: request.reason,
          status: 'Pending',
          createdAtUtc: new Date().toISOString()
        };

        this.mockLeaveRequests.unshift(newLeave);
        return of({ success: true, data: newLeave, message: 'Leave request submitted successfully.' });
      })
    );
  }

  public actionLeaveRequest(id: string, request: ActionLeaveRequestRequest): Observable<ApiResponse<LeaveRequest>> {
    return this.http.patch<ApiResponse<LeaveRequest>>(`${this.baseUrl}/hr/leaves/${id}/action`, request).pipe(
      catchError(() => {
        const leave = this.mockLeaveRequests.find(r => r.id === id);
        if (leave) {
          leave.status = request.status;
          leave.approverEmployeeName = 'Sarah Jenkins';
          leave.actionedAtUtc = new Date().toISOString();
          leave.rejectionReason = request.rejectionReason;
        }
        return of({ success: !!leave, data: leave!, message: `Leave request ${request.status.toLowerCase()} successfully.` });
      })
    );
  }

  public cancelLeaveRequest(id: string): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.baseUrl}/hr/leaves/${id}`).pipe(
      catchError(() => {
        const leave = this.mockLeaveRequests.find(r => r.id === id);
        if (leave) {
          leave.status = 'Cancelled';
        }
        return of({ success: true, data: '', message: 'Leave request cancelled.' });
      })
    );
  }

  public getAttendanceLogs(filter?: AttendanceFilter): Observable<ApiResponse<PagedResponse<AttendanceLog>>> {
    return this.http.get<ApiResponse<PagedResponse<AttendanceLog>>>(`${this.baseUrl}/hr/attendance`, { params: filter as any }).pipe(
      catchError(() => {
        let list = [...this.mockAttendanceLogs];
        if (filter?.status) {
          list = list.filter(a => a.status === filter.status);
        }
        if (filter?.employeeId) {
          list = list.filter(a => a.employeeId === filter.employeeId);
        }

        const res: PagedResponse<AttendanceLog> = {
          success: true,
          data: list,
          totalCount: list.length,
          pageNumber: filter?.page || 1,
          pageSize: filter?.pageSize || 20,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        };

        return of({ success: true, data: res });
      })
    );
  }

  public getTodayAttendance(): Observable<ApiResponse<AttendanceLog | null>> {
    return this.http.get<ApiResponse<AttendanceLog | null>>(`${this.baseUrl}/hr/attendance/today`).pipe(
      catchError(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const log = this.mockAttendanceLogs.find(a => a.employeeId === 'emp-3' && a.date === todayStr);
        return of({ success: true, data: log || null });
      })
    );
  }

  public checkIn(request: CheckInRequest): Observable<ApiResponse<AttendanceLog>> {
    return this.http.post<ApiResponse<AttendanceLog>>(`${this.baseUrl}/hr/attendance/check-in`, request).pipe(
      catchError(() => {
        const emp = this.mockEmployees[2];
        const todayStr = new Date().toISOString().split('T')[0];

        let log = this.mockAttendanceLogs.find(a => a.employeeId === emp.id && a.date === todayStr);
        if (!log) {
          log = {
            id: `att-${Date.now()}`,
            employeeId: emp.id,
            employeeName: emp.fullName,
            employeeNumber: emp.employeeNumber,
            departmentName: emp.departmentName || 'General',
            date: todayStr,
            checkInTimeUtc: new Date().toISOString(),
            status: 'Present',
            workLocation: request.workLocation || 'Office',
            notes: request.notes,
            createdAtUtc: new Date().toISOString()
          };
          this.mockAttendanceLogs.unshift(log);
        } else {
          log.checkInTimeUtc = new Date().toISOString();
          log.workLocation = request.workLocation || log.workLocation;
        }

        return of({ success: true, data: log, message: 'Checked in successfully.' });
      })
    );
  }

  public checkOut(request: CheckOutRequest): Observable<ApiResponse<AttendanceLog>> {
    return this.http.post<ApiResponse<AttendanceLog>>(`${this.baseUrl}/hr/attendance/check-out`, request).pipe(
      catchError(() => {
        const emp = this.mockEmployees[2];
        const todayStr = new Date().toISOString().split('T')[0];
        const log = this.mockAttendanceLogs.find(a => a.employeeId === emp.id && a.date === todayStr);

        if (log && log.checkInTimeUtc) {
          const now = new Date();
          log.checkOutTimeUtc = now.toISOString();
          const inTime = new Date(log.checkInTimeUtc).getTime();
          const hours = (now.getTime() - inTime) / (1000 * 60 * 60);
          log.totalHours = Math.round(Math.max(1, hours) * 10) / 10;
          if (request.notes) {
            log.notes = log.notes ? `${log.notes}; ${request.notes}` : request.notes;
          }
        }

        return of({ success: true, data: log!, message: 'Checked out successfully.' });
      })
    );
  }

  public recordAttendance(request: RecordAttendanceRequest): Observable<ApiResponse<AttendanceLog>> {
    return this.http.post<ApiResponse<AttendanceLog>>(`${this.baseUrl}/hr/attendance/record`, request).pipe(
      catchError(() => {
        const emp = this.mockEmployees.find(e => e.id === request.employeeId) || this.mockEmployees[0];
        const log: AttendanceLog = {
          id: `att-${Date.now()}`,
          employeeId: emp.id,
          employeeName: emp.fullName,
          employeeNumber: emp.employeeNumber,
          departmentName: emp.departmentName || 'General',
          date: request.date,
          checkInTimeUtc: request.checkInTimeUtc,
          checkOutTimeUtc: request.checkOutTimeUtc,
          totalHours: request.checkInTimeUtc && request.checkOutTimeUtc ? 8.0 : undefined,
          status: request.status,
          workLocation: request.workLocation || 'Office',
          notes: request.notes,
          createdAtUtc: new Date().toISOString()
        };

        this.mockAttendanceLogs.unshift(log);
        return of({ success: true, data: log, message: 'Attendance record saved.' });
      })
    );
  }

  public getShiftSchedules(employeeId?: string): Observable<ApiResponse<ShiftSchedule[]>> {
    return this.http.get<ApiResponse<ShiftSchedule[]>>(`${this.baseUrl}/hr/shifts`, { params: employeeId ? { employeeId } : {} }).pipe(
      catchError(() => {
        let list = [...this.mockShiftSchedules];
        if (employeeId) {
          list = list.filter(s => s.employeeId === employeeId);
        }
        return of({ success: true, data: list });
      })
    );
  }

  public createShiftSchedule(request: CreateShiftScheduleRequest): Observable<ApiResponse<ShiftSchedule>> {
    return this.http.post<ApiResponse<ShiftSchedule>>(`${this.baseUrl}/hr/shifts`, request).pipe(
      catchError(() => {
        const emp = this.mockEmployees.find(e => e.id === request.employeeId) || this.mockEmployees[0];
        const newShift: ShiftSchedule = {
          id: `sh-${Date.now()}`,
          employeeId: emp.id,
          employeeName: emp.fullName,
          employeeNumber: emp.employeeNumber,
          shiftName: request.shiftName,
          shiftType: request.shiftType,
          startTime: request.startTime,
          endTime: request.endTime,
          effectiveFromUtc: request.effectiveFromUtc,
          effectiveToUtc: request.effectiveToUtc,
          isActive: true,
          notes: request.notes,
          createdAtUtc: new Date().toISOString()
        };

        this.mockShiftSchedules.unshift(newShift);
        return of({ success: true, data: newShift, message: 'Shift schedule created.' });
      })
    );
  }

  public updateShiftSchedule(id: string, request: UpdateShiftScheduleRequest): Observable<ApiResponse<ShiftSchedule>> {
    return this.http.put<ApiResponse<ShiftSchedule>>(`${this.baseUrl}/hr/shifts/${id}`, request).pipe(
      catchError(() => {
        const shift = this.mockShiftSchedules.find(s => s.id === id);
        if (shift) {
          shift.shiftName = request.shiftName;
          shift.shiftType = request.shiftType;
          shift.startTime = request.startTime;
          shift.endTime = request.endTime;
          shift.effectiveFromUtc = request.effectiveFromUtc;
          shift.effectiveToUtc = request.effectiveToUtc;
          shift.isActive = request.isActive;
          shift.notes = request.notes;
        }
        return of({ success: !!shift, data: shift!, message: 'Shift schedule updated.' });
      })
    );
  }

  public deleteShiftSchedule(id: string): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.baseUrl}/hr/shifts/${id}`).pipe(
      catchError(() => {
        this.mockShiftSchedules = this.mockShiftSchedules.filter(s => s.id !== id);
        return of({ success: true, data: '', message: 'Shift schedule deleted.' });
      })
    );
  }

  // ==========================================
  // 13. EXECUTIVE REPORTS & ANALYTICS
  // ==========================================
  private mockReportHistory: ReportExportHistory[] = [
    {
      id: 'rep-hist-1',
      reportType: 'FinancialSummary',
      title: 'Financial Invoices & Receivables Ledger',
      format: 'Csv',
      generatedByEmployeeName: 'Alex Morgan',
      recordCount: 4,
      fileSizeKb: 1.45,
      createdAtUtc: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: 'rep-hist-2',
      reportType: 'SalesPipeline',
      title: 'CRM Deals & Opportunities Pipeline Report',
      format: 'Json',
      generatedByEmployeeName: 'Sarah Jenkins',
      recordCount: 6,
      fileSizeKb: 2.80,
      createdAtUtc: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 'rep-hist-3',
      reportType: 'InventoryValuation',
      title: 'Multi-Location Inventory Valuation & Stock Report',
      format: 'Csv',
      generatedByEmployeeName: 'David Lee',
      recordCount: 5,
      fileSizeKb: 1.12,
      createdAtUtc: new Date(Date.now() - 3600000 * 48).toISOString()
    }
  ];

  public getExecutiveReports(startDate?: string, endDate?: string): Observable<ApiResponse<ExecutiveDashboard>> {
    const params: string[] = [];
    if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
    if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';

    return this.http.get<ApiResponse<ExecutiveDashboard>>(`${this.baseUrl}/reports/executive${query}`).pipe(
      catchError(() => {
        const mockDashboard: ExecutiveDashboard = {
          financial: {
            totalInvoiced: 30852,
            totalCollected: 10557,
            outstandingAr: 14300,
            overdueAr: 7800,
            collectionRate: 34.2,
            invoiceCount: 4
          },
          sales: {
            totalPipelineValue: 580000,
            weightedPipelineValue: 386000,
            wonRevenue: 220000,
            winRatePercent: 50.0,
            activeDealsCount: 4
          },
          support: {
            totalTickets: 3,
            openTickets: 1,
            resolvedTickets: 1,
            urgentTickets: 1,
            resolutionRatePercent: 33.3
          },
          inventory: {
            totalValuation: 95750,
            totalSkus: 5,
            totalUnitsOnHand: 191,
            lowStockCount: 3
          },
          manufacturing: {
            totalWorkOrders: 4,
            activeWorkOrders: 2,
            completedWorkOrders: 1,
            totalUnitsTarget: 160,
            totalUnitsProduced: 85,
            productionYieldRatePercent: 53.1
          },
          workforce: {
            totalEmployees: 3,
            presentToday: 2,
            attendanceRatePercent: 66.7,
            onLeaveToday: 1,
            pendingLeaveRequests: 1
          },
          revenueTrend: [
            { month: 'Oct 2025', invoiced: 18000, collected: 15000 },
            { month: 'Nov 2025', invoiced: 24500, collected: 21000 },
            { month: 'Dec 2025', invoiced: 31000, collected: 28500 },
            { month: 'Jan 2026', invoiced: 27400, collected: 24000 },
            { month: 'Feb 2026', invoiced: 35200, collected: 29800 },
            { month: 'Mar 2026', invoiced: 42000, collected: 36500 }
          ],
          pipelineFunnel: [
            { stage: 'Lead', count: 1, totalAmount: 60000 },
            { stage: 'Qualified', count: 1, totalAmount: 45000 },
            { stage: 'Proposal', count: 1, totalAmount: 85000 },
            { stage: 'Negotiation', count: 1, totalAmount: 140000 },
            { stage: 'ClosedWon', count: 1, totalAmount: 220000 }
          ],
          departmentDistribution: [
            { category: 'Engineering & Tech', value: 450000, count: 13 },
            { category: 'Operations & Logistics', value: 280000, count: 9 },
            { category: 'Sales & Growth', value: 320000, count: 6 },
            { category: 'Executive Suite', value: 180000, count: 3 }
          ],
          inventoryDistribution: [
            { category: 'Hardware Gateways', value: 42750, count: 45 },
            { category: 'Software Licenses', value: 48000, count: 120 },
            { category: 'Optical Transceivers', value: 2520, count: 18 },
            { category: 'Sensors & IoT', value: 2480, count: 8 }
          ]
        };
        return of({ success: true, data: mockDashboard });
      })
    );
  }

  public exportReport(request: ReportExportRequest): Observable<ApiResponse<ReportExport>> {
    return this.http.post<ApiResponse<ReportExport>>(`${this.baseUrl}/reports/export`, request).pipe(
      catchError(() => {
        const timestamp = new Date().toISOString();
        const dateStamp = timestamp.replace(/[-:T.]/g, '').slice(0, 15);
        let title = 'Financial Invoices & Receivables Ledger';
        let fileName = `Report_Export_${dateStamp}.${request.format.toLowerCase()}`;
        let mimeType = request.format === 'Csv' ? 'text/csv' : 'application/json';
        let content = '';
        let recordCount = 0;

        if (request.reportType === 'FinancialSummary') {
          title = 'Financial Invoices & Receivables Ledger';
          recordCount = this.mockInvoices.length;
          if (request.format === 'Csv') {
            fileName = `Invoices_Ledger_${dateStamp}.csv`;
            const lines = ['InvoiceNumber,CustomerName,IssueDate,DueDate,TotalAmount,AmountPaid,BalanceDue,Status,Currency'];
            for (const inv of this.mockInvoices) {
              lines.push(`"${inv.invoiceNumber}","${inv.customerName}",${inv.issueDateUtc.slice(0, 10)},${inv.dueDateUtc.slice(0, 10)},${inv.totalAmount.toFixed(2)},${inv.amountPaid.toFixed(2)},${inv.balanceDue.toFixed(2)},${inv.status},"${inv.currency}"`);
            }
            content = lines.join('\n');
          } else {
            fileName = `Invoices_Ledger_${dateStamp}.json`;
            content = JSON.stringify(this.mockInvoices, null, 2);
          }
        } else if (request.reportType === 'SalesPipeline') {
          title = 'CRM Deals & Opportunities Pipeline Report';
          recordCount = this.mockDeals.length;
          if (request.format === 'Csv') {
            fileName = `Deals_Pipeline_${dateStamp}.csv`;
            const lines = ['Title,Customer,AssignedRepresentative,Amount,Currency,Stage,Probability,ExpectedCloseDate'];
            for (const d of this.mockDeals) {
              lines.push(`"${d.title}","${d.customerName}","${d.assignedEmployeeName || 'Unassigned'}",${d.amount.toFixed(2)},"${d.currency}",${d.stage},${d.probability}%,${d.expectedCloseDateUtc || ''}`);
            }
            content = lines.join('\n');
          } else {
            fileName = `Deals_Pipeline_${dateStamp}.json`;
            content = JSON.stringify(this.mockDeals, null, 2);
          }
        } else if (request.reportType === 'InventoryValuation') {
          title = 'Multi-Location Inventory Valuation & Stock Report';
          recordCount = this.mockProducts.length;
          if (request.format === 'Csv') {
            fileName = `Inventory_Valuation_${dateStamp}.csv`;
            const lines = ['SKU,ProductName,Category,UnitCost,UnitPrice,TotalOnHand,Valuation,ReorderLevel'];
            for (const p of this.mockProducts) {
              lines.push(`"${p.sku}","${p.name}",${p.category},${p.unitCost.toFixed(2)},${p.unitPrice.toFixed(2)},${p.totalQuantityOnHand},${p.inventoryValuation.toFixed(2)},${p.reorderLevel}`);
            }
            content = lines.join('\n');
          } else {
            fileName = `Inventory_Valuation_${dateStamp}.json`;
            content = JSON.stringify(this.mockProducts, null, 2);
          }
        } else if (request.reportType === 'SupportSla') {
          title = 'Customer Support & SLA Resolution Incident Log';
          recordCount = this.mockTickets.length;
          if (request.format === 'Csv') {
            fileName = `Support_Tickets_${dateStamp}.csv`;
            const lines = ['TicketNumber,Subject,Customer,Priority,Category,Status,CreatedAtUtc,ResolvedAtUtc'];
            for (const t of this.mockTickets) {
              lines.push(`"${t.ticketNumber}","${t.subject}","${t.customerName}",${t.priority},${t.category},${t.status},${t.createdAtUtc.slice(0, 10)},${t.resolvedAtUtc ? t.resolvedAtUtc.slice(0, 10) : ''}`);
            }
            content = lines.join('\n');
          } else {
            fileName = `Support_Tickets_${dateStamp}.json`;
            content = JSON.stringify(this.mockTickets, null, 2);
          }
        } else {
          title = 'HR Workforce Attendance & Roster Log';
          recordCount = this.mockAttendanceLogs.length;
          if (request.format === 'Csv') {
            fileName = `Workforce_Attendance_${dateStamp}.csv`;
            const lines = ['EmployeeNumber,EmployeeName,Department,Date,CheckInUtc,CheckOutUtc,TotalHours,Status,WorkLocation'];
            for (const a of this.mockAttendanceLogs) {
              lines.push(`"${a.employeeNumber}","${a.employeeName}","${a.departmentName}",${a.date},${a.checkInTimeUtc?.slice(11, 16) || ''},${a.checkOutTimeUtc?.slice(11, 16) || ''},${a.totalHours || 0},${a.status},"${a.workLocation}"`);
            }
            content = lines.join('\n');
          } else {
            fileName = `Workforce_Attendance_${dateStamp}.json`;
            content = JSON.stringify(this.mockAttendanceLogs, null, 2);
          }
        }

        const sizeKb = Math.round((new Blob([content]).size / 1024) * 100) / 100;
        const exportResult: ReportExport = {
          id: `exp-${Date.now()}`,
          title,
          reportType: request.reportType,
          format: request.format,
          fileName,
          mimeType,
          content,
          recordCount,
          fileSizeKb: sizeKb,
          generatedAtUtc: timestamp
        };

        this.mockReportHistory.unshift({
          id: exportResult.id,
          reportType: exportResult.reportType,
          title: exportResult.title,
          format: exportResult.format,
          generatedByEmployeeName: 'Alex Morgan',
          recordCount: exportResult.recordCount,
          fileSizeKb: exportResult.fileSizeKb,
          createdAtUtc: exportResult.generatedAtUtc
        });

        return of({ success: true, data: exportResult, message: 'Report generated successfully.' });
      })
    );
  }

  public getReportHistory(): Observable<ApiResponse<ReportExportHistory[]>> {
    return this.http.get<ApiResponse<ReportExportHistory[]>>(`${this.baseUrl}/reports/history`).pipe(
      catchError(() => {
        return of({ success: true, data: this.mockReportHistory });
      })
    );
  }

  // ==========================================
  // SECTION 14: System Audit Trail
  // ==========================================

  private mockAuditLogs: AuditLog[] = [
    {
      id: 'aud-1',
      tenantId: '11111111-2222-3333-4444-555555555555',
      userId: 'user-demo-owner',
      userEmail: 'owner@starlight.com',
      action: 'UserLogin',
      entityName: 'ApplicationUser',
      entityId: 'user-demo-owner',
      detailsJson: JSON.stringify({ role: 'Owner', ipAddress: '192.168.1.100', browser: 'Chrome 130.0', outcome: 'Success' }),
      ipAddress: '192.168.1.100',
      timestampUtc: new Date(Date.now() - 1000 * 60 * 15).toISOString()
    },
    {
      id: 'aud-2',
      tenantId: '11111111-2222-3333-4444-555555555555',
      userId: 'user-demo-manager',
      userEmail: 'manager@starlight.com',
      action: 'CreateWorkOrder',
      entityName: 'WorkOrder',
      entityId: 'WO-2026-0002',
      detailsJson: JSON.stringify({ product: 'STR-ACC-X1', targetQuantity: 100, plant: 'Austin Hub', priority: 'Urgent' }),
      ipAddress: '192.168.1.142',
      timestampUtc: new Date(Date.now() - 1000 * 60 * 45).toISOString()
    },
    {
      id: 'aud-3',
      tenantId: '11111111-2222-3333-4444-555555555555',
      userId: 'user-demo-owner',
      userEmail: 'owner@starlight.com',
      action: 'RecordPayment',
      entityName: 'PaymentRecord',
      entityId: 'PAY-2026-0001',
      detailsJson: JSON.stringify({ invoiceNumber: 'INV-2026-0001', amount: 148500, method: 'BankTransfer', reference: 'WIRE-CYB-88319' }),
      ipAddress: '192.168.1.100',
      timestampUtc: new Date(Date.now() - 1000 * 60 * 120).toISOString()
    },
    {
      id: 'aud-4',
      tenantId: '11111111-2222-3333-4444-555555555555',
      userId: 'user-demo-employee',
      userEmail: 'employee@starlight.com',
      action: 'ClockIn',
      entityName: 'AttendanceLog',
      entityId: 'EMP-003',
      detailsJson: JSON.stringify({ workLocation: 'Austin Operations Hub', status: 'Present', clientTime: '09:00:00' }),
      ipAddress: '10.0.4.15',
      timestampUtc: new Date(Date.now() - 1000 * 60 * 180).toISOString()
    },
    {
      id: 'aud-5',
      tenantId: '11111111-2222-3333-4444-555555555555',
      userId: 'user-demo-manager',
      userEmail: 'manager@starlight.com',
      action: 'ResolveTicket',
      entityName: 'SupportTicket',
      entityId: 'TCK-1001',
      detailsJson: JSON.stringify({ ticketNumber: 'TCK-1001', resolution: 'Applied latency patch and indexed buffers.' }),
      ipAddress: '192.168.1.142',
      timestampUtc: new Date(Date.now() - 1000 * 60 * 240).toISOString()
    }
  ];

  public getAuditLogs(filter?: AuditLogFilter): Observable<ApiResponse<PagedResponse<AuditLog>>> {
    let params: any = {};
    if (filter) {
      if (filter.search) params.search = filter.search;
      if (filter.entityName) params.entityName = filter.entityName;
      if (filter.action) params.action = filter.action;
      if (filter.fromDateUtc) params.fromDateUtc = filter.fromDateUtc;
      if (filter.toDateUtc) params.toDateUtc = filter.toDateUtc;
      if (filter.pageNumber) params.pageNumber = filter.pageNumber;
      if (filter.pageSize) params.pageSize = filter.pageSize;
    }

    return this.http.get<ApiResponse<PagedResponse<AuditLog>>>(`${this.baseUrl}/audit`, { params }).pipe(
      catchError(() => {
        let items = [...this.mockAuditLogs];
        if (filter?.search) {
          const s = filter.search.toLowerCase();
          items = items.filter(i =>
            i.action.toLowerCase().includes(s) ||
            i.entityName.toLowerCase().includes(s) ||
            (i.userEmail && i.userEmail.toLowerCase().includes(s)) ||
            (i.entityId && i.entityId.toLowerCase().includes(s))
          );
        }
        if (filter?.entityName && filter.entityName !== 'All') {
          items = items.filter(i => i.entityName === filter.entityName);
        }
        if (filter?.action && filter.action !== 'All') {
          items = items.filter(i => i.action === filter.action);
        }

        const page = filter?.pageNumber || 1;
        const size = filter?.pageSize || 25;
        const pagedData: PagedResponse<AuditLog> = {
          success: true,
          data: items.slice((page - 1) * size, page * size),
          pageNumber: page,
          pageSize: size,
          totalCount: items.length,
          totalPages: Math.ceil(items.length / size) || 1,
          hasPreviousPage: page > 1,
          hasNextPage: page * size < items.length
        };

        return of({ success: true, data: pagedData });
      })
    );
  }
}



