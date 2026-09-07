using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillPath.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionSourceAttribution : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SourceAttribution",
                table: "Questions",
                type: "TEXT",
                maxLength: 30,
                nullable: false,
                defaultValue: "catalog");

            migrationBuilder.Sql(
                "UPDATE Questions SET SourceAttribution = 'ctfl_278' WHERE SourceKey LIKE 'CTFL:%'");
            migrationBuilder.Sql(
                "UPDATE Questions SET SourceAttribution = 'admin' WHERE SourceKey LIKE 'admin:%'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SourceAttribution",
                table: "Questions");
        }
    }
}
