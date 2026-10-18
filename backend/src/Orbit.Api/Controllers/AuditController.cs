using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Audit.Dtos;
using Orbit.Domain.Enums;

namespace Orbit.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/audit")]
public class AuditController : ControllerBase
{
    private readonly IAuditService _auditService;
    private readonly ITenantContext _tenantContext;

    public AuditController(IAuditService auditService, ITenantContext tenantContext)
    {
        _auditService = auditService;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<AuditLogDto>>>> GetLogs(
        [FromQuery] AuditLogFilterRequest filter,
        CancellationToken cancellationToken)
    {
        AssertAdminOrOwnerOrManager();
        var result = await _auditService.GetLogsAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResponse<AuditLogDto>>.Ok(result));
    }

    private void AssertAdminOrOwnerOrManager()
    {
        if (_tenantContext.CurrentRole != TenantRole.Owner &&
            _tenantContext.CurrentRole != TenantRole.Admin &&
            _tenantContext.CurrentRole != TenantRole.Manager)
        {
            throw new ForbiddenAccessException("Audit trail inspection is restricted to managers and administrators.");
        }
    }
}
