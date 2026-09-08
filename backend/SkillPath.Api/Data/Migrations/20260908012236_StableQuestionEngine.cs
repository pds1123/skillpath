using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillPath.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class StableQuestionEngine : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InteractionType",
                table: "Questions",
                type: "TEXT",
                maxLength: 30,
                nullable: false,
                defaultValue: "single_choice");

            migrationBuilder.Sql(
                """
                UPDATE Questions
                SET InteractionType = CASE
                    WHEN json_extract(InteractionData, '$.kind') = 'dropdown' THEN 'dropdown'
                    WHEN json_extract(InteractionData, '$.kind') = 'yesno' THEN 'yes_no_matrix'
                    WHEN json_extract(InteractionData, '$.kind') = 'self_grade' THEN 'image_self_grade'
                    WHEN json_extract(InteractionData, '$.kind') = 'click' THEN 'image_hotspot'
                    WHEN json_extract(InteractionData, '$.kind') = 'match'
                         AND (lower(Prompt) LIKE '%arrange%'
                              OR lower(Prompt) LIKE '%in which order%'
                              OR lower(Prompt) LIKE '%from the least%'
                              OR lower(Prompt) LIKE '%from the highest%') THEN 'ordering'
                    WHEN json_extract(InteractionData, '$.kind') = 'match'
                         AND json_array_length(json_extract(InteractionData, '$.prompts')) > 1
                         AND json_extract(InteractionData, '$.prompts[0].text') = json_extract(InteractionData, '$.prompts[1].text') THEN 'unordered_selection'
                    WHEN json_extract(InteractionData, '$.kind') = 'match' THEN 'fixed_match'
                    WHEN QuestionType = 'yes_no' THEN 'yes_no'
                    WHEN QuestionType = 'drag_drop' THEN 'unordered_selection'
                    WHEN QuestionType = 'hotspot' THEN 'yes_no_matrix'
                    WHEN QuestionType = 'self_grade' THEN 'image_self_grade'
                    WHEN (SELECT COUNT(*) FROM QuestionOptions option WHERE option.QuestionId = Questions.Id AND option.IsCorrect = 1) > 1 THEN 'multiple_choice'
                    ELSE 'single_choice'
                END
                """);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Questions_InteractionType",
                table: "Questions",
                sql: "InteractionType IN ('single_choice', 'multiple_choice', 'yes_no', 'unordered_selection', 'fixed_match', 'ordering', 'dropdown', 'yes_no_matrix', 'image_self_grade', 'image_hotspot')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Questions_InteractionType",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "InteractionType",
                table: "Questions");
        }
    }
}
