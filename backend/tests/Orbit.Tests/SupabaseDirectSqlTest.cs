using System;
using System.Threading.Tasks;
using Npgsql;
using Xunit;
using Xunit.Abstractions;

namespace Orbit.Tests;

public class SupabaseDirectSqlTest
{
    private readonly ITestOutputHelper _output;

    public SupabaseDirectSqlTest(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public async Task Query_Direct_Supabase_Database_Tables()
    {
        var connStr = "Host=aws-0-eu-west-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.wqblftpekhlldtljoicd;Password=112233445566778899mmMM;SSL Mode=Require;Trust Server Certificate=true;Timeout=15";

        await using var conn = new NpgsqlConnection(connStr);
        await conn.OpenAsync();

        _output.WriteLine("================ DIRECT SUPABASE POSTGRESQL VERIFICATION ================");

        var queries = new (string Name, string Sql)[]
        {
            ("Total Registered Tenants", "SELECT count(*) FROM \"Tenants\";"),
            ("Total User Accounts", "SELECT count(*) FROM \"AspNetUsers\";"),
            ("Total Customers in Database", "SELECT count(*) FROM \"Customers\";"),
            ("Total CRM Deals in Database", "SELECT count(*) FROM \"Deals\";"),
            ("Total Support Tickets in Database", "SELECT count(*) FROM \"SupportTickets\";"),
            ("Total Audit Log Events in Database", "SELECT count(*) FROM \"AuditLogs\";")
        };

        foreach (var q in queries)
        {
            await using var cmd = new NpgsqlCommand(q.Sql, conn);
            var count = await cmd.ExecuteScalarAsync();
            _output.WriteLine($"  ✓ {q.Name}: {count}");
        }

        _output.WriteLine("\nLatest 5 Audit Records Stored Directly in PostgreSQL \"AuditLogs\":");
        var auditSql = "SELECT \"Action\", \"EntityName\", \"UserEmail\", \"TimestampUtc\", \"DetailsJson\" FROM \"AuditLogs\" ORDER BY \"TimestampUtc\" DESC LIMIT 5;";
        await using var auditCmd = new NpgsqlCommand(auditSql, conn);
        await using var reader = await auditCmd.ExecuteReaderAsync();
        int idx = 1;
        while (await reader.ReadAsync())
        {
            var action = reader.GetString(0);
            var entity = reader.GetString(1);
            var email = reader.IsDBNull(2) ? "N/A" : reader.GetString(2);
            var ts = reader.GetDateTime(3);
            var details = reader.IsDBNull(4) ? "None" : reader.GetString(4);
            _output.WriteLine($"  [{idx++}] [{ts:yyyy-MM-dd HH:mm:ss UTC}] Action: {action} | Entity: {entity} | User: {email}");
            _output.WriteLine($"      Payload: {details}");
        }

        _output.WriteLine("==========================================================================");
    }

    [Fact]
    public async Task Ensure_Employee_Contract_Columns()
    {
        var connStr = "Host=aws-0-eu-west-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.wqblftpekhlldtljoicd;Password=112233445566778899mmMM;SSL Mode=Require;Trust Server Certificate=true;Timeout=15";

        await using var conn = new NpgsqlConnection(connStr);
        await conn.OpenAsync();

        var alterStatements = new[]
        {
            "ALTER TABLE \"Employees\" ADD COLUMN IF NOT EXISTS \"ContractType\" text NOT NULL DEFAULT 'Permanent Full-Time';",
            "ALTER TABLE \"Employees\" ADD COLUMN IF NOT EXISTS \"ContractStartDateUtc\" timestamp with time zone NULL;",
            "ALTER TABLE \"Employees\" ADD COLUMN IF NOT EXISTS \"ContractEndDateUtc\" timestamp with time zone NULL;",
            "ALTER TABLE \"Employees\" ADD COLUMN IF NOT EXISTS \"ContractDocumentUrl\" text NULL;",
            "ALTER TABLE \"Employees\" ADD COLUMN IF NOT EXISTS \"ContractNotes\" text NULL;",
            "ALTER TABLE \"Employees\" ADD COLUMN IF NOT EXISTS \"BaseMonthlySalary\" numeric NOT NULL DEFAULT 3500;"
        };

        foreach (var sql in alterStatements)
        {
            try
            {
                await using var cmd = new NpgsqlCommand(sql, conn);
                await cmd.ExecuteNonQueryAsync();
                _output.WriteLine($"Executed: {sql}");
            }
            catch (Exception ex)
            {
                _output.WriteLine($"Error on {sql}: {ex.Message}");
            }
        }

        // Query columns on Employees
        var queryColSql = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Employees' AND column_name LIKE 'Contract%';";
        await using var colCmd = new NpgsqlCommand(queryColSql, conn);
        await using var reader = await colCmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            _output.WriteLine($"Column verified: {reader.GetString(0)} ({reader.GetString(1)})");
        }
    }
}
