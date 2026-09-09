using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillPath.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCurriculumVersionHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContentRevisions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    EntityType = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    EntityId = table.Column<long>(type: "INTEGER", nullable: false),
                    Version = table.Column<int>(type: "INTEGER", nullable: false),
                    ChangeType = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    SnapshotJson = table.Column<string>(type: "TEXT", nullable: false),
                    ChangedByUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ChangedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentRevisions", x => x.Id);
                    table.CheckConstraint("CK_ContentRevisions_ChangeType", "ChangeType IN ('seeded', 'created', 'updated', 'published', 'unpublished', 'reordered', 'archived')");
                    table.CheckConstraint("CK_ContentRevisions_EntityType", "EntityType IN ('module', 'lesson')");
                    table.CheckConstraint("CK_ContentRevisions_Snapshot", "json_valid(SnapshotJson)");
                    table.CheckConstraint("CK_ContentRevisions_Version", "Version > 0");
                    table.ForeignKey(
                        name: "FK_ContentRevisions_Users_ChangedByUserId",
                        column: x => x.ChangedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContentRevisions_ChangedByUserId",
                table: "ContentRevisions",
                column: "ChangedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ContentRevisions_EntityType_EntityId_ChangedAt",
                table: "ContentRevisions",
                columns: new[] { "EntityType", "EntityId", "ChangedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ContentRevisions_EntityType_EntityId_Version",
                table: "ContentRevisions",
                columns: new[] { "EntityType", "EntityId", "Version" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContentRevisions");
        }
    }
}
