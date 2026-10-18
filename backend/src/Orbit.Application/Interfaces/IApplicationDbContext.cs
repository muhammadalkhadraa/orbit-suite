using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Orbit.Domain.Entities;

namespace Orbit.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Tenant> Tenants { get; }
    DbSet<TenantMembership> TenantMemberships { get; }
    DbSet<Branch> Branches { get; }
    DbSet<Department> Departments { get; }
    DbSet<EmployeeProfile> Employees { get; }
    DbSet<TaskItem> Tasks { get; }
    DbSet<Customer> Customers { get; }
    DbSet<Deal> Deals { get; }
    DbSet<SupportTicket> SupportTickets { get; }
    DbSet<TicketComment> TicketComments { get; }
    DbSet<Product> Products { get; }
    DbSet<ProductInventory> ProductInventories { get; }
    DbSet<StockMovement> StockMovements { get; }
    DbSet<Invoice> Invoices { get; }
    DbSet<InvoiceItem> InvoiceItems { get; }
    DbSet<PaymentRecord> PaymentRecords { get; }
    DbSet<BillOfMaterials> BillsOfMaterials { get; }
    DbSet<BomItem> BomItems { get; }
    DbSet<WorkOrder> WorkOrders { get; }
    DbSet<LeaveRequest> LeaveRequests { get; }
    DbSet<AttendanceLog> AttendanceLogs { get; }
    DbSet<ShiftSchedule> ShiftSchedules { get; }
    DbSet<ReportExportHistory> ReportExports { get; }
    DbSet<AuditLog> AuditLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
