using System;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Common;
using Orbit.Application.Modules.Support.Dtos;

namespace Orbit.Application.Modules.Support;

public interface ITicketService
{
    Task<PagedResponse<SupportTicketDto>> GetTicketsAsync(TicketFilterRequest filter, CancellationToken cancellationToken = default);
    Task<SupportTicketDto> GetTicketByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<SupportTicketDto> CreateTicketAsync(CreateTicketRequest request, CancellationToken cancellationToken = default);
    Task<SupportTicketDto> UpdateTicketAsync(Guid id, UpdateTicketRequest request, CancellationToken cancellationToken = default);
    Task<SupportTicketDto> UpdateTicketStatusAsync(Guid id, UpdateTicketStatusRequest request, CancellationToken cancellationToken = default);
    Task<TicketCommentDto> AddCommentAsync(Guid ticketId, AddTicketCommentRequest request, CancellationToken cancellationToken = default);
    Task DeleteTicketAsync(Guid id, CancellationToken cancellationToken = default);
    Task<TicketMetricsDto> GetTicketMetricsAsync(CancellationToken cancellationToken = default);
}
