'use client';

import { useState, useEffect } from 'react';
import { getLists, addList, updateList, deleteList } from '../lib/api';
import { TodoList } from '../lib/types';

interface ListsProps {
  onListSelect: (listId: string) => void;
  selectedList?: string;
}

const Lists = ({ onListSelect, selectedList }: ListsProps) => {
  const [lists, setLists] = useState<TodoList[]>([]);
  const [newListName, setNewListName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingList, setEditingList] = useState<TodoList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; listId: string; listName: string }>({
    isOpen: false,
    listId: '',
    listName: ''
  });

  useEffect(() => {
    const fetchLists = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedLists = await getLists();
        setLists(fetchedLists);
      } catch (err) {
        setError('Failed to fetch lists');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLists();
  }, []);

  const handleAddList = async () => {
    if (!newListName.trim()) return;

    try {
      const newList = await addList(newListName.trim());
      setLists((prev) => [...prev, newList]);
      setNewListName('');
      setIsEditing(false);
    } catch (err) {
      setError('Failed to add list');
    }
  };

  const handleUpdateList = async () => {
    if (!editingList || !newListName.trim()) return;

    try {
      await updateList(editingList.id, newListName.trim());
      setLists((prev) =>
        prev.map((list) =>
          list.id === editingList.id ? { ...editingList, name: newListName } : list
        )
      );
      setEditingList(null);
      setNewListName('');
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update list');
    }
  };

  const confirmDeleteList = (id: string, name: string) => {
    setDeleteConfirmation({
      isOpen: true,
      listId: id,
      listName: name
    });
  };

  const handleDeleteList = async (id: string) => {
    try {
      await deleteList(id);
      setLists((prev) => prev.filter((list) => list.id !== id));
      if (selectedList === id) {
        onListSelect('default');
      }
      setDeleteConfirmation({ isOpen: false, listId: '', listName: '' });
    } catch (err) {
      setError('Failed to delete list');
    }
  };

  const handleEditList = (list: TodoList) => {
    setEditingList(list);
    setNewListName(list.name);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditingList(null);
    setNewListName('');
    setIsEditing(false);
  };

  const cancelDeleteConfirmation = () => {
    setDeleteConfirmation({ isOpen: false, listId: '', listName: '' });
  };

  if (isLoading) {
    return <div className="text-center p-12">Loading lists...</div>;
  }

  if (error) {
    return <div className="text-center p-12 text-red-500">{error}</div>;
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Lists</h2>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 rounded-full hover:bg-gray-100"
        >
          +
        </button>
      </div>

      {isEditing && (
        <div className="mb-6">
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="List name"
            className="w-full bg-white text-gray-900 placeholder-gray-400 rounded-xl px-4 py-2 text-base font-medium border border-gray-200 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 mb-3"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-100 text-gray-600 font-medium rounded-lg hover:bg-gray-200 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={editingList ? handleUpdateList : handleAddList}
              className="px-3 py-1 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-all duration-200"
            >
              {editingList ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {/* All Lists option */}
        <div
          onClick={() => onListSelect('all')}
          className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
            selectedList === undefined ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
          }`}
        >
          <span className="font-medium">All Tasks</span>
        </div>

        {/* Lists */}
        {lists.map((list) => (
          <div
            key={list.id}
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
              selectedList === list.id ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
            }`}
          >
            <div
              className="flex-1"
              onClick={() => onListSelect(list.id)}
            >
              <span className="font-medium">{list.name}</span>
            </div>
            
            {list.id !== 'default' && (
                <div className="flex gap-1">
                    <button
                        onClick={() => handleEditList(list)}
                        className={`p-1 rounded-full ${
                            selectedList === list.id ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
                        }`}
                    >
                        ...
                    </button>
                    <button
                        onClick={() => confirmDeleteList(list.id, list.name)}
                        className={`p-1 rounded-full ${
                            selectedList === list.id ? 'hover:bg-gray-800 text-red-300' : 'hover:bg-gray-200 text-red-500'
                        }`}
                    >
                        -
                    </button>
                </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all">
          <div className="bg-white text-gray-900 rounded-3xl shadow-2xl max-w-md w-full p-6 relative animate-fade-in">
            <h3 className="text-xl font-bold mb-4">Delete List</h3>
            <p className="mb-6">
              Are you sure you want to delete the list "{deleteConfirmation.listName}"? This action cannot be undone and all todos in this list will be deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDeleteConfirmation}
                className="px-4 py-2 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteList(deleteConfirmation.listId)}
                className="px-4 py-2 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-all duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lists; 