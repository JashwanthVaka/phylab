#!/usr/bin/env /usr/bin/python3
"""Extracts per-page text from a PDF using the PDFKit bridge built into macOS.

Deliberately uses /usr/bin/python3 (the system interpreter) because it ships the
PyObjC Quartz bindings, so KINETIQ needs no pip installs to read a book you own.

Usage: /usr/bin/python3 tools/extract-pdf.py <input.pdf>
Writes JSON to stdout: {"pages": ["page 1 text", ...]}
"""
import json
import sys

try:
    from Foundation import NSURL
    from Quartz import PDFDocument
except ImportError:
    sys.stderr.write(
        "This needs the system Python at /usr/bin/python3, which bundles PyObjC.\n"
        "Run: /usr/bin/python3 tools/extract-pdf.py <file.pdf>\n"
    )
    sys.exit(2)


def main():
    if len(sys.argv) < 2:
        sys.stderr.write("usage: extract-pdf.py <input.pdf>\n")
        sys.exit(2)

    url = NSURL.fileURLWithPath_(sys.argv[1])
    document = PDFDocument.alloc().initWithURL_(url)
    if document is None:
        sys.stderr.write("Could not open that PDF. Is it password protected?\n")
        sys.exit(1)

    pages = []
    for index in range(document.pageCount()):
        page = document.pageAtIndex_(index)
        pages.append(page.string() or "")

    scanned = sum(1 for text in pages if len(text.strip()) < 20)
    json.dump({"pages": pages, "emptyPages": scanned}, sys.stdout)


if __name__ == "__main__":
    main()
