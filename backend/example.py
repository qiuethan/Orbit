"""
Simple Face Analysis Example

Change the image_file and custom_prompt below to test.
"""

from pipeline import complete_face_analysis

# Change these variables to test
image_file = "image.jpg"
custom_prompt = "Who is this person and what are they known for? Please let me know of their interests and hobbies and such."

# Run analysis
results = complete_face_analysis(image_file, custom_prompt)

# Show results
if results.get("success"):
    print("✅ Analysis completed!")
    
    # Summary
    summary = results["summary"]
    print(f"Found: {summary['face_matches']} faces, {summary['total_mentions']} mentions, {summary['scraped_pages']} pages")
    
    # AI Analysis
    analysis = results["llm_analysis"]
    if "analysis" in analysis:
        print(f"\n🤖 {analysis['provider']} ({analysis['model']}):")
        print(analysis["analysis"])
    else:
        print(f"❌ AI failed: {analysis['error']}")
else:
    print(f"❌ Failed: {results['error']}")