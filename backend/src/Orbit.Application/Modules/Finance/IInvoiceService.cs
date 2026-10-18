using System;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Common;
using Orbit.Application.Modules.Finance.Dtos;

namespace Orbit.Application.Modules.Finance;

public interface IInvoiceService
{
    Task<PagedResponse<InvoiceDto>> GetInvoicesAsync(InvoiceFilterRequest filter, CancellationToken cancellationToken = default);
    Task<InvoiceDto> GetInvoiceByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<InvoiceDto> CreateInvoiceAsync(CreateInvoiceRequest request, CancellationToken cancellationToken = default);
    Task<InvoiceDto> UpdateInvoiceAsync(Guid id, UpdateInvoiceRequest request, CancellationToken cancellationToken = default);
    Task<InvoiceDto> IssueInvoiceAsync(Guid id, CancellationToken cancellationToken = default);
    Task<InvoiceDto> VoidInvoiceAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PaymentRecordDto> RecordPaymentAsync(Guid invoiceId, RecordPaymentRequest request, CancellationToken cancellationToken = default);
    Task DeleteInvoiceAsync(Guid id, CancellationToken cancellationToken = default);
    Task<FinancialMetricsDto> GetFinancialMetricsAsync(CancellationToken cancellationToken = default);
}
