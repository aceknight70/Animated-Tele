import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

target_delete = """  const deleteRoom = async (id: string) => {
    saveHistory(rooms);
    const filtered = rooms.filter((r) => r.id !== id);
    // re-calculate positions
    const updatedRooms = filtered.map((r, idx) => ({ ...r, position: idx }));
    
    setRooms(updatedRooms);

    if (selectedRoomId === id) {
      setSelectedRoomId(updatedRooms[0]?.id || null);
    }

    try {
      await deleteRoomInDb(id);
      await updateRoomPositions(updatedRooms.map(r => ({ id: r.id, position: r.position })));
    } catch (err: any) {
      setErrorMsg('Failed to delete room: ' + err.message);
      setRooms(rooms);
    }
  };"""

replacement_delete = """  const deleteRoom = async (id: string) => {
    saveHistory(rooms);
    let updatedRoomsToSave: {id: string, position: number}[] = [];
    
    setRooms(prevRooms => {
      const filtered = prevRooms.filter((r) => r.id !== id);
      const updatedRooms = filtered.map((r, idx) => ({ ...r, position: idx }));
      updatedRoomsToSave = updatedRooms.map(r => ({ id: r.id, position: r.position }));
      
      if (selectedRoomId === id) {
        setSelectedRoomId(updatedRooms[0]?.id || null);
      }
      return updatedRooms;
    });

    try {
      await deleteRoomInDb(id);
      await updateRoomPositions(updatedRoomsToSave);
    } catch (err: any) {
      setErrorMsg('Failed to delete room: ' + err.message);
      loadRooms();
    }
  };"""

target_move = """  const moveRoom = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === rooms.length - 1) return;

    saveHistory(rooms);
    const newRooms = [...rooms];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newRooms[index], newRooms[targetIndex]] = [newRooms[targetIndex], newRooms[index]];
    
    // Update positions
    newRooms.forEach((r, idx) => r.position = idx);
    setRooms(newRooms);

    try {
      await updateRoomPositions(newRooms.map(r => ({ id: r.id, position: r.position })));
    } catch (err: any) {
      setErrorMsg('Failed to move room: ' + err.message);
      setRooms(rooms); // rollback
    }
  };"""

replacement_move = """  const moveRoom = async (index: number, direction: 'up' | 'down') => {
    saveHistory(rooms);
    let updatedRoomsToSave: {id: string, position: number}[] = [];
    
    setRooms(prevRooms => {
      if (direction === 'up' && index === 0) return prevRooms;
      if (direction === 'down' && index === prevRooms.length - 1) return prevRooms;

      const newRooms = [...prevRooms];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newRooms[index], newRooms[targetIndex]] = [newRooms[targetIndex], newRooms[index]];
      
      newRooms.forEach((r, idx) => r.position = idx);
      updatedRoomsToSave = newRooms.map(r => ({ id: r.id, position: r.position }));
      return newRooms;
    });

    try {
      if (updatedRoomsToSave.length > 0) {
        await updateRoomPositions(updatedRoomsToSave);
      }
    } catch (err: any) {
      setErrorMsg('Failed to move room: ' + err.message);
      loadRooms();
    }
  };"""

if target_delete in content:
    content = content.replace(target_delete, replacement_delete)
    print("Replaced deleteRoom successfully")
else:
    print("Target deleteRoom not found")

if target_move in content:
    content = content.replace(target_move, replacement_move)
    print("Replaced moveRoom successfully")
else:
    print("Target moveRoom not found")

with open('src/App.tsx', 'w') as f:
    f.write(content)

