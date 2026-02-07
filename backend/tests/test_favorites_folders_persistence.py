"""
Sanity test: favorites and folders persist across backend restarts.
- Create folder, favorite a conversation, move conversation to folder.
- Re-query DB (simulating another process/restart): data must still be there.
Run: cd backend && python -m pytest tests/test_favorites_folders_persistence.py -v
Or:  cd backend && python -c "import tests.test_favorites_folders_persistence as t; t.test_favorites_folders_persist(); print('OK')"
"""
import os
import sys

# Run from backend directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_favorites_folders_persist():
    from debate_db import (
        init_debate_db,
        create_debate,
        append_message,
        list_debates,
        list_folders,
        list_favorite_ids,
        create_folder,
        toggle_favorite,
        set_debate_folder,
    )

    init_debate_db()

    # Create a debate (with at least one message so it appears in list_debates) and a folder
    d = create_debate(title="Sanity test debate")
    debate_id = d.id
    append_message(debate_id, "user", "hello")
    folder = create_folder("Sanity folder")
    folder_id = folder.id

    # Favorite the debate and assign to folder
    toggle_favorite(debate_id)
    set_debate_folder(debate_id, folder_id)

    # Simulate "after restart": re-query from DB (no in-memory state)
    debates = list_debates()
    folders = list_folders()
    fav_ids = list_favorite_ids()

    # Assert persistence
    by_id = {x["id"]: x for x in debates}
    assert debate_id in by_id, "Debate should appear in list_debates"
    assert by_id[debate_id]["is_favorite"] is True, "Debate should be favorite"
    assert by_id[debate_id]["folder_id"] == folder_id, "Debate should be in folder"

    assert debate_id in fav_ids, "Debate id should be in list_favorite_ids"
    folder_row = next((f for f in folders if f["id"] == folder_id), None)
    assert folder_row is not None, "Folder should exist"
    assert debate_id in folder_row["chatIds"], "Folder should contain the debate"


def test_list_debates_excludes_empty():
    """list_debates must only return debates that have at least one message."""
    from debate_db import init_debate_db, create_debate, append_message, list_debates

    init_debate_db()

    empty = create_debate(title="Empty debate")
    with_msg = create_debate(title="With message")
    append_message(with_msg.id, "user", "first message")

    debates = list_debates()
    ids = {x["id"] for x in debates}
    assert empty.id not in ids, "Empty debate must not appear in list_debates"
    assert with_msg.id in ids, "Debate with message must appear in list_debates"
