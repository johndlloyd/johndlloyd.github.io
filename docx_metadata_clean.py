#!/usr/bin/env python3
import argparse
import os
import shutil
import sys
import tempfile
import zipfile
import xml.etree.ElementTree as ET


CORE_PATH = "docProps/core.xml"
APP_PATH = "docProps/app.xml"
CUSTOM_PATH = "docProps/custom.xml"


def local_name(tag: str) -> str:
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def parse_xml_from_zip(zf: zipfile.ZipFile, path: str):
    try:
        data = zf.read(path)
    except KeyError:
        return None, None
    root = ET.fromstring(data)
    tree = ET.ElementTree(root)
    return tree, root


def collect_metadata(docx_path: str):
    items = []
    with zipfile.ZipFile(docx_path, "r") as zf:
        for part_name, part_path in [
            ("core", CORE_PATH),
            ("app", APP_PATH),
            ("custom", CUSTOM_PATH),
        ]:
            tree, root = parse_xml_from_zip(zf, part_path)
            if root is None:
                continue

            for child in list(root):
                name = local_name(child.tag)
                if part_name == "custom" and "name" in child.attrib:
                    name = child.attrib["name"]
                value = "".join(child.itertext()).strip()
                items.append(
                    {
                        "part": part_name,
                        "path": part_path,
                        "name": name,
                        "value": value,
                    }
                )
    return items


def print_metadata(items, title):
    print(f"\n{title}")
    if not items:
        print("  (no metadata fields found)")
        return
    for idx, item in enumerate(items, start=1):
        value = item["value"] if item["value"] else "(empty)"
        print(f"  {idx:>2}. [{item['part']}] {item['name']} = {value}")


def ask_selection(count: int):
    if count == 0:
        return set()

    print("\nChoose what to remove:")
    print("  - Type numbers separated by commas (example: 1,3,5)")
    print("  - Type 'all' to remove all metadata fields")
    print("  - Type 'none' to keep everything")
    raw = input("> ").strip().lower()

    if raw in {"none", "n", ""}:
        return set()
    if raw == "all":
        return set(range(1, count + 1))

    chosen = set()
    for token in raw.split(","):
        token = token.strip()
        if not token:
            continue
        if not token.isdigit():
            raise ValueError(f"Invalid selection token: '{token}'")
        num = int(token)
        if num < 1 or num > count:
            raise ValueError(f"Selection out of range: {num}")
        chosen.add(num)
    return chosen


def remove_selected(docx_path: str, items, selected_idxs, backup: bool):
    if not selected_idxs:
        return False

    if backup:
        backup_path = docx_path + ".bak"
        shutil.copy2(docx_path, backup_path)
        print(f"\nBackup created: {backup_path}")

    paths_touched = {items[i - 1]["path"] for i in selected_idxs}
    selected_by_path = {}
    for idx in selected_idxs:
        item = items[idx - 1]
        selected_by_path.setdefault(item["path"], []).append(item)

    with zipfile.ZipFile(docx_path, "r") as zin, tempfile.NamedTemporaryFile(
        delete=False, suffix=".docx"
    ) as tmp:
        tmp_path = tmp.name

    try:
        with zipfile.ZipFile(docx_path, "r") as zin, zipfile.ZipFile(
            tmp_path, "w", compression=zipfile.ZIP_DEFLATED
        ) as zout:
            for info in zin.infolist():
                data = zin.read(info.filename)
                if info.filename not in paths_touched:
                    zout.writestr(info, data)
                    continue

                root = ET.fromstring(data)
                changed = False
                for child in list(root):
                    child_name = local_name(child.tag)
                    for sel in selected_by_path[info.filename]:
                        expected = sel["name"]
                        if sel["part"] == "custom":
                            actual = child.attrib.get("name", "")
                        else:
                            actual = child_name
                        if actual == expected:
                            root.remove(child)
                            changed = True
                            break

                if changed:
                    updated = ET.tostring(root, encoding="utf-8", xml_declaration=True)
                    zout.writestr(info, updated)
                else:
                    zout.writestr(info, data)

        shutil.move(tmp_path, docx_path)
        return True
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def main():
    parser = argparse.ArgumentParser(
        description="Show DOCX metadata, ask what to remove, remove it, then show updated metadata."
    )
    parser.add_argument("docx", help="Path to .docx file")
    parser.add_argument(
        "--no-backup", action="store_true", help="Do not create .bak backup"
    )
    args = parser.parse_args()

    if not os.path.isfile(args.docx):
        print(f"File not found: {args.docx}", file=sys.stderr)
        sys.exit(1)
    if not args.docx.lower().endswith(".docx"):
        print("Input file must be a .docx", file=sys.stderr)
        sys.exit(1)

    try:
        before = collect_metadata(args.docx)
        print_metadata(before, "Current metadata:")
        selected = ask_selection(len(before))
        changed = remove_selected(args.docx, before, selected, backup=not args.no_backup)
        if not selected:
            print("\nNo metadata removed.")
        elif changed:
            print("\nSelected metadata removed.")
        else:
            print("\nNothing changed.")

        after = collect_metadata(args.docx)
        print_metadata(after, "Updated metadata:")
    except KeyboardInterrupt:
        print("\nCancelled.")
        sys.exit(130)
    except Exception as exc:
        print(f"\nError: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
