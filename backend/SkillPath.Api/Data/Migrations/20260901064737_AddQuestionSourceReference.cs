using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillPath.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionSourceReference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SourceReference",
                table: "Questions",
                type: "TEXT",
                maxLength: 100,
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE Questions SET SourceReference = '278.' || LegacyId WHERE SourceAttribution IN ('ctfl_278', 'ctfl_278_399')");
            migrationBuilder.Sql(
                "UPDATE Questions SET SourceReference = REPLACE(SourceKey, 'CTFL399:', '399.') WHERE SourceAttribution = 'ctfl_399'");
            migrationBuilder.Sql(
                "UPDATE Questions SET SourceReference = 'admin.' || LegacyId WHERE SourceAttribution = 'admin'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SourceReference",
                table: "Questions");
        }
    }
}
