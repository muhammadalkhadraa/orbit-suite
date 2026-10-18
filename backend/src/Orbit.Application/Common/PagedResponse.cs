using System.Collections.Generic;

namespace Orbit.Application.Common;

public class PagedResponse<T>
{
    public bool Success { get; set; } = true;
    public IReadOnlyList<T> Data { get; set; } = new List<T>();
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages => PageSize > 0 ? (int)System.Math.Ceiling(TotalCount / (double)PageSize) : 0;
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;

    public PagedResponse() { }

    public PagedResponse(IReadOnlyList<T> data, int count, int pageNumber, int pageSize)
    {
        Data = data;
        TotalCount = count;
        PageNumber = pageNumber;
        PageSize = pageSize;
        Success = true;
    }

    public static PagedResponse<T> Create(IReadOnlyList<T> data, int count, int pageNumber, int pageSize)
        => new(data, count, pageNumber, pageSize);
}
