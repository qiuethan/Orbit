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
    
    # Show best match photo
    best_photo = results.get("best_match_photo")
    if best_photo:
        print(f"\n📸 Best match photo found:")
        print(f"   Source: {best_photo['source_url']}")
        print(f"   Confidence: {best_photo['confidence_score']}/100")
        print(f"   Data: {len(best_photo['base64_data'])} bytes (base64)")

    # Show AI analysis
    analysis = results.get("llm_analysis", {})
    if use_structured_output and analysis.get("structured_data"):
        # Structured output - show key fields
        person = analysis["structured_data"]
        print(f"\n👤 Name: {person.personal_info.full_name or 'Unknown'}")
        print(f"💼 Job: {person.professional_info.current_position or 'Unknown'}")
        if person.overview:
            print(f"📝 Overview: {person.overview}")
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
            # Save structured data with photo as JSON
            schema_manager = OutputSchemaManager()
            structured_output = {
                "person_analysis": json.loads(schema_manager.to_json(analysis["structured_data"])),
                "best_match_photo": results.get("best_match_photo"),
                "metadata": {
                    "llm_provider": analysis.get("provider"),
                    "llm_model": analysis.get("model"),
                    "face_matches": results.get("summary", {}).get("face_matches", 0),
                    "total_mentions": results.get("summary", {}).get("total_mentions", 0)
                }
            }
            filename = "analysis_structured.json"
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(structured_output, f, indent=2, ensure_ascii=False)
            print(f"\n💾 Structured data with photo saved to: {filename}")
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