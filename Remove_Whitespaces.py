#!/usr/bin/env python3

import re
import argparse
from pathlib import Path


# def clean_srt_text(text: str) -> str:
#     # Normalize Unicode whitespace to regular spaces (except newlines)
#     text = re.sub(r"[^\S\n]+", " ", text)

#     # Limit blank lines to max one
#     text = re.sub(r"\n{3,}", "\n\n", text)

#     return text

def clean_srt_text(text: str) -> str:
    # 1. Convert all known Unicode space variants to a normal space
    text = re.sub(
        r"[\u00A0\u2000-\u200B\u202F\u205F\u3000]",
        " ",
        text
    )

    # 2. Remove zero-width characters entirely
    text = re.sub(
        r"[\u200B\u200C\u200D\u2060\uFEFF]",
        "",
        text
    )

    # 3. Collapse multiple spaces (now all the same kind)
    text = re.sub(r" {2,}", " ", text)

    # 4. Strip leading/trailing spaces per line
    text = "\n".join(line.strip() for line in text.splitlines())

    # 5. Normalize blank lines (SRT-safe)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text



def process_folder(input_dir: Path, output_dir: Path, overwrite: bool):
    output_dir.mkdir(parents=True, exist_ok=True)

    srt_files = list(input_dir.glob("*.srt"))

    if not srt_files:
        print("No .srt files found.")
        return

    for srt_path in srt_files:
        with open(srt_path, "r", encoding="utf-8") as f:
            original_text = f.read()

        cleaned_text = clean_srt_text(original_text)

        output_path = (
            srt_path if overwrite else output_dir / srt_path.name
        )

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(cleaned_text)

        print(f"✔ Processed: {srt_path.name}")


def main():
    parser = argparse.ArgumentParser(
        description="Batch clean duplicate whitespace in SRT subtitle files"
    )
    parser.add_argument(
        "input_folder",
        type=Path,
        help="Folder containing .srt files",
    )
    parser.add_argument(
        "-o",
        "--output-folder",
        type=Path,
        default=Path("cleaned_subtitles"),
        help="Folder for cleaned files (ignored if --overwrite is used)",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite original files instead of creating new ones",
    )

    args = parser.parse_args()

    if not args.input_folder.exists():
        raise FileNotFoundError("Input folder does not exist")

    process_folder(
        input_dir=args.input_folder,
        output_dir=args.output_folder,
        overwrite=args.overwrite,
    )


if __name__ == "__main__":
    main()
