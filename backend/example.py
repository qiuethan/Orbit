"""
Simple Face Analysis Example

Change the settings below and run: python example.py
"""

import json
from pipeline import complete_face_analysis
from output_schema import OutputSchemaManager

# --- Settings ---
image_file = "image.jpg"
use_structured_output = True  # True for JSON schema, False for text
save_to_file = True  # Save results to file

# --- Run Analysis ---
print(f"🔍 Analyzing: {image_file}")
print(f"📋 Output format: {'Structured JSON' if use_structured_output else 'Text'}")

results = complete_face_analysis(
    image_file, 
    use_structured_output=use_structured_output
)

# --- Show Results ---
if results.get("success"):
    print("✅ Success!")
    
    # Show summary
    summary = results.get("summary", {})
    print(f"Found: {summary.get('face_matches', 0)} faces, {summary.get('total_mentions', 0)} mentions")
    
    # Show AI analysis
    analysis = results.get("llm_analysis", {})
    if use_structured_output and analysis.get("structured_data"):
        # Structured output - show key fields
        person = analysis["structured_data"]
        print(f"\n👤 Name: {person.personal_info.full_name or 'Unknown'}")
        print(f"💼 Job: {person.professional_info.current_position or 'Unknown'}")
        if person.social_media:
            print(f"📱 Social: {len(person.social_media)} platforms found")
    elif analysis.get("analysis"):
        # Text output
        print(f"\n🤖 Analysis:\n{analysis['analysis']}")
    else:
        print(f"❌ AI analysis failed: {analysis.get('error', 'Unknown error')}")
    
    # --- Save to File ---
    if save_to_file:
        if use_structured_output and analysis.get("structured_data"):
            # Save structured data as JSON
            schema_manager = OutputSchemaManager()
            json_output = schema_manager.to_json(analysis["structured_data"])
            filename = "analysis_structured.json"
            with open(filename, "w", encoding="utf-8") as f:
                f.write(json_output)
            print(f"\n💾 Structured data saved to: {filename}")
        else:
            # Save full results as JSON
            filename = "analysis_results.json"
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            print(f"\n💾 Results saved to: {filename}")

else:
    print(f"❌ Failed: {results.get('error', 'Unknown error')}")
    
    # Save error results too
    if save_to_file:
        filename = "analysis_error.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Error details saved to: {filename}")