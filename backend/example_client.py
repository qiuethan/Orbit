import os
import sys
import json
import requests

"""
Python client to POST a JPG image to the FastAPI endpoint and save the JSON response.
Equivalent to:
  curl -v -X POST "http://127.0.0.1:8000/analyze" -F "image=@image2.jpg;type=image/jpeg"

Usage:
  python3 example_client.py [optional_path_to_image]

Environment variables:
  ANALYZE_URL  (default: http://127.0.0.1:8000/analyze)
"""


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    url = os.environ.get("ANALYZE_URL", "http://127.0.0.1:8000/analyze")

    # Default image file is image2.jpg in the same directory as this script
    default_image = os.path.join(script_dir, "image2.jpg")
    image_path = sys.argv[1] if len(sys.argv) > 1 else default_image

    if not os.path.isfile(image_path):
        print(f"Error: image file not found at: {image_path}")
        print("Pass the path to a JPG image as the first argument, or place 'image2.jpg' next to this script.")
        sys.exit(1)

    print(f"POST {url}")
    print(f"Uploading image: {image_path}")

    try:
        with open(image_path, "rb") as f:
            files = {
                "image": (os.path.basename(image_path), f, "image/jpeg"),
            }
            resp = requests.post(url, files=files, timeout=300)
    except requests.RequestException as e:
        print(f"Request failed: {e}")
        sys.exit(1)

    print(f"Response status: {resp.status_code}")

    # Try to decode JSON; if that fails, save raw text with metadata
    out_path = os.path.join(script_dir, "client_results.json")
    try:
        data = resp.json()
    except ValueError:
        data = {
            "status_code": resp.status_code,
            "non_json_response": resp.text,
        }

    try:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Saved response JSON to: {out_path}")
    except OSError as e:
        print(f"Failed to write output file: {e}")
        sys.exit(1)


def main2():
    """
    Fetch the cached list from /list and write it to list_results.json.
    Equivalent to:
      curl http://127.0.0.1:8000/list > list_results.json
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    url = os.environ.get("LIST_URL", "http://127.0.0.1:8000/list")
    out_path = os.path.join(script_dir, "list_results.json")

    print(f"GET {url}")
    try:
        resp = requests.get(url, timeout=120)
    except requests.RequestException as e:
        print(f"Request failed: {e}")
        sys.exit(1)

    # Try to parse and pretty-print; fall back to raw text
    try:
        data = resp.json()
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except ValueError:
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(resp.text)

    print(f"Saved list to: {out_path}")


if __name__ == "__main__":
    main()
