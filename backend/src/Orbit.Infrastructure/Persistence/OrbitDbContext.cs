using System;
using System.Security;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Interfaces;
using Orbit.Domain.Common;
using Orbit.Domain.Entities;
using Orbit.Infrastructure.Identity;

namespace Orbit.Infrastructure.Persistence;

public class OrbitDbContext : IdentityDbContext<ApplicationUser>, IApplicationDbContext
{
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUserService;

    public OrbitDbContext(
        DbContextOptions<OrbitDbContext> options,
        ITenantContext tenantContext,
        ICurrentUserService currentUserService) : base(options)
    {
        _tenantContext = tenantContext;
        _currentUserService = currentUserService;
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<TenantMembership> TenantMemberships => Set<TenantMembership>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<EmployeeProfile> Employees => Set<EmployeeProfile>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Deal> Deals => Set<Deal>();
    public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();
    public DbSet<TicketComment> TicketComments => Set<TicketComment>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductInventory> ProductInventories => Set<ProductInventory>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<PaymentRecord> PaymentRecords => Set<PaymentRecord>();
    public DbSet<BillOfMaterials> BillsOfMaterials => Set<BillOfMaterials>();
    public DbSet<BomItem> BomItems => Set<BomItem>();
    public DbSet<WorkOrder> WorkOrders => Set<WorkOrder>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<AttendanceLog> AttendanceLogs => Set<AttendanceLog>();
    public DbSet<ShiftSchedule> ShiftSchedules => Set<ShiftSchedule>();
    public DbSet<ReportExportHistory> ReportExports => Set<ReportExportHistory>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // 1. Tenant Entity Configuration
        builder.Entity<Tenant>(b =>
        {
            b.HasKey(t => t.Id);
            b.Property(t => t.Name).IsRequired().HasMaxLength(150);
            b.Property(t => t.Slug).IsRequired().HasMaxLength(50);
            b.HasIndex(t => t.Slug).IsUnique();
        });

        // 2. TenantMembership Configuration
        builder.Entity<TenantMembership>(b =>
        {
            b.HasKey(m => m.Id);
            b.HasOne(m => m.Tenant)
                .WithMany(t => t.Memberships)
                .HasForeignKey(m => m.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne<ApplicationUser>()
                .WithMany(u => u.Memberships)
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasIndex(m => new { m.TenantId, m.UserId }).IsUnique();

            // Note: TenantMemberships are queried by UserId during authentication,
            // so we don't apply global tenant filter here to allow multi-tenant membership resolution.
        });

        // 3. Branch Configuration
        builder.Entity<Branch>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(150);
            b.Property(x => x.Code).IsRequired().HasMaxLength(50);
            b.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.Branches)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 4. Department Configuration
        builder.Entity<Department>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(150);
            b.Property(x => x.Code).IsRequired().HasMaxLength(50);
            b.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.Departments)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 5. EmployeeProfile Configuration
        builder.Entity<EmployeeProfile>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.EmployeeNumber).IsRequired().HasMaxLength(50);
            b.Property(x => x.FirstName).IsRequired().HasMaxLength(100);
            b.Property(x => x.LastName).IsRequired().HasMaxLength(100);
            b.Property(x => x.Email).IsRequired().HasMaxLength(256);
            b.Property(x => x.JobTitle).IsRequired().HasMaxLength(100);

            b.HasIndex(x => new { x.TenantId, x.EmployeeNumber }).IsUnique();

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.Employees)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Branch)
                .WithMany(br => br.Employees)
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.Department)
                .WithMany(d => d.Employees)
                .HasForeignKey(x => x.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.ReportsTo)
                .WithMany(m => m.DirectReports)
                .HasForeignKey(x => x.ReportsToEmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 6. TaskItem Configuration
        builder.Entity<TaskItem>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Title).IsRequired().HasMaxLength(200);
            b.Property(x => x.Description).HasMaxLength(2000);

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.Tasks)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.AssignedEmployee)
                .WithMany(e => e.AssignedTasks)
                .HasForeignKey(x => x.AssignedEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.CreatedByEmployee)
                .WithMany(e => e.CreatedTasks)
                .HasForeignKey(x => x.CreatedByEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.Department)
                .WithMany(d => d.Tasks)
                .HasForeignKey(x => x.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 7. AuditLog Configuration
        builder.Entity<AuditLog>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Action).IsRequired().HasMaxLength(100);
            b.Property(x => x.EntityName).IsRequired().HasMaxLength(100);
            b.HasIndex(x => new { x.TenantId, x.TimestampUtc });

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 8. Customer Configuration
        builder.Entity<Customer>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.CompanyName).IsRequired().HasMaxLength(200);
            b.Property(x => x.ContactPerson).HasMaxLength(150);
            b.Property(x => x.Email).HasMaxLength(150);
            b.Property(x => x.Phone).HasMaxLength(50);
            b.Property(x => x.Website).HasMaxLength(200);
            b.Property(x => x.Industry).HasMaxLength(100);
            b.Property(x => x.Notes).HasMaxLength(2000);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.AssignedEmployee)
                .WithMany()
                .HasForeignKey(x => x.AssignedEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasIndex(x => new { x.TenantId, x.CompanyName });
            b.HasIndex(x => x.AssignedEmployeeId);

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 9. Deal (Opportunity) Configuration
        builder.Entity<Deal>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Title).IsRequired().HasMaxLength(200);
            b.Property(x => x.Currency).IsRequired().HasMaxLength(10);
            b.Property(x => x.Amount).HasPrecision(18, 2);
            b.Property(x => x.Notes).HasMaxLength(2000);
            b.Property(x => x.LostReason).HasMaxLength(500);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Customer)
                .WithMany(c => c.Deals)
                .HasForeignKey(x => x.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.AssignedEmployee)
                .WithMany(e => e.AssignedDeals)
                .HasForeignKey(x => x.AssignedEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasIndex(x => new { x.TenantId, x.Stage });
            b.HasIndex(x => x.CustomerId);
            b.HasIndex(x => x.AssignedEmployeeId);

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 10. SupportTicket Configuration
        builder.Entity<SupportTicket>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.TicketNumber).IsRequired().HasMaxLength(50);
            b.Property(x => x.Subject).IsRequired().HasMaxLength(200);
            b.Property(x => x.Description).IsRequired().HasMaxLength(4000);
            b.Property(x => x.ResolutionSummary).HasMaxLength(2000);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Customer)
                .WithMany()
                .HasForeignKey(x => x.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.AssignedEmployee)
                .WithMany()
                .HasForeignKey(x => x.AssignedEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.CreatedByEmployee)
                .WithMany()
                .HasForeignKey(x => x.CreatedByEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasMany(x => x.Comments)
                .WithOne(c => c.Ticket)
                .HasForeignKey(c => c.TicketId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasIndex(x => new { x.TenantId, x.TicketNumber }).IsUnique();
            b.HasIndex(x => new { x.TenantId, x.Status });
            b.HasIndex(x => x.CustomerId);
            b.HasIndex(x => x.AssignedEmployeeId);

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 11. TicketComment Configuration
        builder.Entity<TicketComment>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.AuthorName).IsRequired().HasMaxLength(100);
            b.Property(x => x.CommentText).IsRequired().HasMaxLength(2000);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Ticket)
                .WithMany(t => t.Comments)
                .HasForeignKey(x => x.TicketId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.AuthorEmployee)
                .WithMany()
                .HasForeignKey(x => x.AuthorEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasIndex(x => new { x.TenantId, x.TicketId });

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 12. Product Configuration
        builder.Entity<Product>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Sku).IsRequired().HasMaxLength(100);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.Property(x => x.Description).HasMaxLength(2000);
            b.Property(x => x.UnitOfMeasure).IsRequired().HasMaxLength(50);
            b.Property(x => x.UnitPrice).HasPrecision(18, 2);
            b.Property(x => x.UnitCost).HasPrecision(18, 2);
            b.Property(x => x.ReorderLevel).HasPrecision(18, 2);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasIndex(x => new { x.TenantId, x.Sku }).IsUnique();
            b.HasIndex(x => new { x.TenantId, x.Category });

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 13. ProductInventory Configuration
        builder.Entity<ProductInventory>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.QuantityOnHand).HasPrecision(18, 2);
            b.Property(x => x.QuantityReserved).HasPrecision(18, 2);
            b.Property(x => x.AisleBinLocation).HasMaxLength(100);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Product)
                .WithMany(p => p.Inventories)
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Branch)
                .WithMany()
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasIndex(x => new { x.TenantId, x.ProductId, x.BranchId }).IsUnique();
            b.HasIndex(x => new { x.TenantId, x.BranchId });

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 14. StockMovement Configuration
        builder.Entity<StockMovement>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Quantity).HasPrecision(18, 2);
            b.Property(x => x.UnitCost).HasPrecision(18, 2);
            b.Property(x => x.ReferenceNumber).HasMaxLength(100);
            b.Property(x => x.Reason).HasMaxLength(500);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Product)
                .WithMany(p => p.StockMovements)
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Branch)
                .WithMany()
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.DestinationBranch)
                .WithMany()
                .HasForeignKey(x => x.DestinationBranchId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.PerformedByEmployee)
                .WithMany()
                .HasForeignKey(x => x.PerformedByEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasIndex(x => new { x.TenantId, x.ProductId, x.TimestampUtc });
            b.HasIndex(x => new { x.TenantId, x.BranchId });

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 15. Invoice Configuration
        builder.Entity<Invoice>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.InvoiceNumber).IsRequired().HasMaxLength(50);
            b.Property(x => x.Currency).IsRequired().HasMaxLength(10);
            b.Property(x => x.Subtotal).HasPrecision(18, 2);
            b.Property(x => x.TaxRate).HasPrecision(18, 2);
            b.Property(x => x.TaxAmount).HasPrecision(18, 2);
            b.Property(x => x.DiscountAmount).HasPrecision(18, 2);
            b.Property(x => x.TotalAmount).HasPrecision(18, 2);
            b.Property(x => x.AmountPaid).HasPrecision(18, 2);
            b.Property(x => x.Notes).HasMaxLength(2000);
            b.Property(x => x.TermsAndConditions).HasMaxLength(2000);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Customer)
                .WithMany()
                .HasForeignKey(x => x.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Deal)
                .WithMany()
                .HasForeignKey(x => x.DealId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasMany(x => x.Items)
                .WithOne(i => i.Invoice)
                .HasForeignKey(i => i.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasMany(x => x.Payments)
                .WithOne(p => p.Invoice)
                .HasForeignKey(p => p.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasIndex(x => new { x.TenantId, x.InvoiceNumber }).IsUnique();
            b.HasIndex(x => new { x.TenantId, x.CustomerId });
            b.HasIndex(x => new { x.TenantId, x.Status });

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 16. InvoiceItem Configuration
        builder.Entity<InvoiceItem>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Description).IsRequired().HasMaxLength(500);
            b.Property(x => x.Quantity).HasPrecision(18, 2);
            b.Property(x => x.UnitPrice).HasPrecision(18, 2);
            b.Property(x => x.TaxAmount).HasPrecision(18, 2);
            b.Property(x => x.TotalAmount).HasPrecision(18, 2);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasIndex(x => new { x.TenantId, x.InvoiceId });

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 17. PaymentRecord Configuration
        builder.Entity<PaymentRecord>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.PaymentNumber).IsRequired().HasMaxLength(50);
            b.Property(x => x.Amount).HasPrecision(18, 2);
            b.Property(x => x.ReferenceNumber).HasMaxLength(100);
            b.Property(x => x.Notes).HasMaxLength(1000);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.RecordedByEmployee)
                .WithMany()
                .HasForeignKey(x => x.RecordedByEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasIndex(x => new { x.TenantId, x.PaymentNumber }).IsUnique();
            b.HasIndex(x => new { x.TenantId, x.InvoiceId });

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 18. BillOfMaterials Configuration
        builder.Entity<BillOfMaterials>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.BomNumber).IsRequired().HasMaxLength(50);
            b.Property(x => x.Name).IsRequired().HasMaxLength(150);
            b.Property(x => x.Description).HasMaxLength(1000);
            b.Property(x => x.Version).HasMaxLength(20);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasMany(x => x.Items)
                .WithOne(x => x.BillOfMaterials)
                .HasForeignKey(x => x.BillOfMaterialsId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasIndex(x => new { x.TenantId, x.BomNumber }).IsUnique();
            b.HasIndex(x => new { x.TenantId, x.ProductId });

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 19. BomItem Configuration
        builder.Entity<BomItem>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.QuantityRequired).HasPrecision(18, 2);
            b.Property(x => x.UnitOfMeasure).HasMaxLength(50);
            b.Property(x => x.Notes).HasMaxLength(500);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.ComponentProduct)
                .WithMany()
                .HasForeignKey(x => x.ComponentProductId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasIndex(x => new { x.TenantId, x.BillOfMaterialsId });

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 20. WorkOrder Configuration
        builder.Entity<WorkOrder>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.OrderNumber).IsRequired().HasMaxLength(50);
            b.Property(x => x.QuantityTarget).HasPrecision(18, 2);
            b.Property(x => x.QuantityProduced).HasPrecision(18, 2);
            b.Property(x => x.Notes).HasMaxLength(2000);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.BillOfMaterials)
                .WithMany()
                .HasForeignKey(x => x.BillOfMaterialsId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.Branch)
                .WithMany()
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.AssignedEmployee)
                .WithMany()
                .HasForeignKey(x => x.AssignedEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasIndex(x => new { x.TenantId, x.OrderNumber }).IsUnique();
            b.HasIndex(x => new { x.TenantId, x.Status });
            b.HasIndex(x => new { x.TenantId, x.BranchId });

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 21. LeaveRequest Configuration
        builder.Entity<LeaveRequest>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.RequestNumber).IsRequired().HasMaxLength(50);
            b.Property(x => x.Reason).HasMaxLength(1000);
            b.Property(x => x.RejectionReason).HasMaxLength(1000);
            b.Property(x => x.DaysCount).HasPrecision(5, 2);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Employee)
                .WithMany(e => e.LeaveRequests)
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.ApproverEmployee)
                .WithMany()
                .HasForeignKey(x => x.ApproverEmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasIndex(x => new { x.TenantId, x.RequestNumber }).IsUnique();
            b.HasIndex(x => new { x.TenantId, x.EmployeeId });
            b.HasIndex(x => new { x.TenantId, x.Status });

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 22. AttendanceLog Configuration
        builder.Entity<AttendanceLog>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.WorkLocation).HasMaxLength(100);
            b.Property(x => x.Notes).HasMaxLength(500);
            b.Property(x => x.TotalHours).HasPrecision(5, 2);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Employee)
                .WithMany(e => e.AttendanceLogs)
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasIndex(x => new { x.TenantId, x.EmployeeId, x.Date }).IsUnique();
            b.HasIndex(x => new { x.TenantId, x.Date });

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 23. ShiftSchedule Configuration
        builder.Entity<ShiftSchedule>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.ShiftName).IsRequired().HasMaxLength(100);
            b.Property(x => x.Notes).HasMaxLength(500);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Employee)
                .WithMany(e => e.ShiftSchedules)
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasIndex(x => new { x.TenantId, x.EmployeeId });

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });

        // 24. ReportExportHistory Configuration
        builder.Entity<ReportExportHistory>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Title).IsRequired().HasMaxLength(150);
            b.Property(x => x.FileSizeKb).HasPrecision(10, 2);

            b.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.GeneratedByEmployee)
                .WithMany()
                .HasForeignKey(x => x.GeneratedByEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasIndex(x => new { x.TenantId, x.CreatedAtUtc });

            b.HasQueryFilter(x => x.TenantId == (_tenantContext.CurrentTenantId ?? Guid.Empty));
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var currentUser = _currentUserService.Email ?? _currentUserService.UserId ?? "System";

        // Multi-tenant defensive verification & automatic stamping
        foreach (var entry in ChangeTracker.Entries<ITenantScopedEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.TenantId == Guid.Empty)
                {
                    if (_tenantContext.CurrentTenantId.HasValue && _tenantContext.CurrentTenantId.Value != Guid.Empty)
                    {
                        entry.Entity.TenantId = _tenantContext.CurrentTenantId.Value;
                    }
                    else
                    {
                        throw new SecurityException("Cannot save tenant-scoped entity without an active TenantId context.");
                    }
                }
                else if (_tenantContext.CurrentTenantId.HasValue && entry.Entity.TenantId != _tenantContext.CurrentTenantId.Value)
                {
                    throw new SecurityException("Cross-tenant entity creation is strictly prohibited.");
                }
            }
            else if (entry.State == EntityState.Modified)
            {
                if (entry.Property(nameof(ITenantScopedEntity.TenantId)).IsModified)
                {
                    throw new SecurityException("Modifying the TenantId of an existing entity is strictly prohibited.");
                }
            }
        }

        // Auditing & timestamps
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAtUtc = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAtUtc = now;
            }
        }

        foreach (var entry in ChangeTracker.Entries<IAuditableEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedBy ??= currentUser;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedBy = currentUser;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
