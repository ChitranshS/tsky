'use client';

import { useState, useEffect, useRef } from 'react';
import { getNotes, addNote, updateNote, deleteNote } from '../lib/api';
import { Note, DateFilter } from '../lib/types';
import ReactMarkdown from 'react-markdown';

interface NotesProps {
  selectedDate?: string;
}

const Notes = ({ selectedDate }: NotesProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [important, setImportant] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showOnlyImportant, setShowOnlyImportant] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedNotes = await getNotes(selectedDate);
        setNotes(fetchedNotes);
      } catch (err) {
        setError('Failed to fetch notes');
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotes();
  }, [dateFilter, selectedDate]);

  // Set content in contentEditable when entering edit mode
  useEffect(() => {
    if (isEditing && contentEditableRef.current && content) {
      contentEditableRef.current.innerText = content;
    }
  }, [isEditing]);

  const handleAddNote = async () => {
    if (!title.trim()) return;
    try {
      const newNote = await addNote({
        title: title.trim(),
        content: content.trim(),
        isImportant: important,
      });
      setNotes((prev) => [newNote, ...prev]);
      handleCancel();
    } catch (err) {
      setError('Failed to add note');
    }
  };

  const handleUpdateNote = async () => {
    if (!activeNote || !title.trim()) return;
    try {
      await updateNote(activeNote.id, {
        title: title.trim(),
        content: content.trim(),
        isImportant: important,
      });
      setNotes((prev) =>
        prev.map((note) =>
          note.id === activeNote.id ? { ...activeNote, title, content, isImportant: important } : note
        )
      );
      handleCancel();
    } catch (err) {
      setError('Failed to update note');
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((note) => note.id !== id));
      handleCancel();
    } catch (err) {
      setError('Failed to delete note');
    }
  };

  const handleNoteClick = (note: Note) => {
    setActiveNote(note);
    setIsModalOpen(true);
    setIsEditing(false);
    setTitle(note.title);
    setContent(note.content);
    setImportant(!!note.isImportant);
  };

  const handleEdit = () => {
    if (!activeNote) return;
    setIsEditing(true);
  };

  const handleCancel = () => {
    setActiveNote(null);
    setTitle('');
    setContent('');
    setIsEditing(false);
    setIsModalOpen(false);
    setImportant(false);
  };

  const truncate = (text: string, length: number) => {
    // Remove markdown syntax for preview
    let cleanText = text
      .replace(/^#+\s+/gm, '') // Remove headings
      .replace(/^>\s+/gm, '') // Remove quote markers
      .replace(/^[-*•]\s+/gm, '') // Remove bullet points
      .replace(/^[\d]+\.\s+/gm, '') // Remove numbered lists
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/<u>([^<]+)<\/u>/g, '$1') // Remove underline
      .trim();
    
    return cleanText.length > length ? cleanText.substring(0, length) + '...' : cleanText;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredNotes = showOnlyImportant 
    ? notes.filter(n => n.isImportant) 
    : notes.sort((a, b) => {
        // Important notes first, then by creation date (newest first)
        if (a.isImportant && !b.isImportant) return -1;
        if (!a.isImportant && b.isImportant) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

  // Enhanced content editing functions
  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerText;
    setContent(newContent);
  };



  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const tabNode = document.createTextNode('\t');
      range.deleteContents();
      range.insertNode(tabNode);
      range.setStartAfter(tabNode);
      range.setEndAfter(tabNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Update content state
      if (contentEditableRef.current) {
        setContent(contentEditableRef.current.innerText);
      }
    } else if (e.key === 'Enter') {
      // Handle Enter key for better list formatting
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const currentNode = range.startContainer;
      
      // Check if we're at the beginning of a line with a bullet point
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const text = currentNode.textContent || '';
        const lineStart = text.lastIndexOf('\n', range.startOffset - 1) + 1;
        const lineText = text.substring(lineStart, range.startOffset);
        
        // If we're at a bullet point, create a new bullet point
        if (lineText.trim().match(/^[•\-\*]\s/)) {
          e.preventDefault();
          const newLineNode = document.createTextNode('\n• ');
          range.deleteContents();
          range.insertNode(newLineNode);
          range.setStartAfter(newLineNode);
          range.setEndAfter(newLineNode);
          selection.removeAllRanges();
          selection.addRange(range);
          
          // Update content state
          if (contentEditableRef.current) {
            setContent(contentEditableRef.current.innerText);
          }
        }
      }
    } else if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
      // Cmd+B or Ctrl+B for bold
      e.preventDefault();
      insertBold();
    } else if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
      // Cmd+I or Ctrl+I for italic
      e.preventDefault();
      insertItalic();
    }
  };

  const insertText = (text: string) => {
    if (!contentEditableRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const textNode = document.createTextNode(text);
    range.deleteContents();
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Update content state
    setContent(contentEditableRef.current.innerText);
    contentEditableRef.current.focus();
  };

  const insertBulletPoint = () => {
    insertText('• ');
  };

  const insertNumberedList = () => {
    insertText('1. ');
  };

  const insertBold = () => {
    if (!contentEditableRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (selectedText) {
      // If text is selected, wrap it with **
      const newText = `**${selectedText}**`;
      range.deleteContents();
      range.insertNode(document.createTextNode(newText));
    } else {
      // If no text selected, insert ** at cursor
      const textNode = document.createTextNode('**bold text**');
      range.insertNode(textNode);
      // Position cursor between ** and **
      range.setStart(textNode, 2);
      range.setEnd(textNode, textNode.length - 2);
    }
    
    selection.removeAllRanges();
    selection.addRange(range);
    setContent(contentEditableRef.current.innerText);
    contentEditableRef.current.focus();
  };

  const insertItalic = () => {
    if (!contentEditableRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (selectedText) {
      // If text is selected, wrap it with *
      const newText = `*${selectedText}*`;
      range.deleteContents();
      range.insertNode(document.createTextNode(newText));
    } else {
      // If no text selected, insert * at cursor
      const textNode = document.createTextNode('*italic text*');
      range.insertNode(textNode);
      // Position cursor between * and *
      range.setStart(textNode, 1);
      range.setEnd(textNode, textNode.length - 1);
    }
    
    selection.removeAllRanges();
    selection.addRange(range);
    setContent(contentEditableRef.current.innerText);
    contentEditableRef.current.focus();
  };

  const insertUnderline = () => {
    insertText('<u>underlined text</u>');
  };

  const insertHeading1 = () => {
    insertText('# ');
  };

  const insertHeading2 = () => {
    insertText('## ');
  };

  const insertHeading3 = () => {
    insertText('### ');
  };

  const insertQuote = () => {
    insertText('> ');
  };

  const insertCodeBlock = () => {
    insertText('```\n\n```');
  };

  if (isLoading) {
    return <div className="text-center p-12">Loading notes...</div>;
  }

  if (error) {
    return <div className="text-center p-12 text-red-500">{error}</div>;
  }

  return (
    <div className="h-auto bg-white rounded-3xl p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Notes</h2>
        <div className="flex items-center gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            disabled={!!selectedDate}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1"
          >
            <option value="all">All Notes</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button
            onClick={() => setShowOnlyImportant(v => !v)}
            className={`p-1 rounded-full border ${showOnlyImportant ? 'bg-yellow-400 text-white border-yellow-400' : 'bg-gray-100 text-yellow-500 border-gray-200'} transition-all`}
            aria-label="Show only important notes"
            title="Show only important notes"
          >
            ★
          </button>
          <button
            onClick={() => {
              setActiveNote(null);
              setTitle('');
              setContent('');
              setIsEditing(true);
              setImportant(false);
              setIsModalOpen(true);
              // Clear contentEditable div after modal opens
              setTimeout(() => {
                if (contentEditableRef.current) {
                  contentEditableRef.current.innerText = '';
                  contentEditableRef.current.focus();
                }
              }, 100);
            }}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Add note"
          >
            +
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredNotes.length > 0 ? (
          <div className="space-y-4">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleNoteClick(note)}
                className={`bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 transition-all duration-200 cursor-pointer flex items-center gap-2 ${note.isImportant ? 'ring-2 ring-yellow-300' : ''}`}
                tabIndex={0}
                aria-label={`Open note: ${note.title}`}
                onKeyDown={e => { if (e.key === 'Enter') handleNoteClick(note); }}
              >
                <span className={`text-lg mr-2 ${note.isImportant ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{note.title}</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {truncate(note.content, 100)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-700 mb-1">No notes yet</h3>
            <p className="text-sm text-gray-500">
              Click the + button to add your first note
            </p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all">
          <div className="bg-white text-gray-900 rounded-2xl shadow-2xl w-[90vw] h-[90vh] flex flex-col relative animate-fade-in font-sans overflow-hidden">
            {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? (activeNote ? 'Edit Note' : 'New Note') : 'View Note'}
              </h2>
              <button
                onClick={handleCancel}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {isEditing ? (
                <div className="h-full flex flex-col">
                  {/* Enhanced Toolbar */}
                  <div className="flex items-center gap-4 p-4 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">Format:</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        className="p-2 rounded hover:bg-white transition-all" 
                        type="button" 
                        onClick={insertHeading1}
                        title="Heading 1"
                      >
                        <span className="font-bold text-sm">H1</span>
                      </button>
                      <button 
                        className="p-2 rounded hover:bg-white transition-all" 
                        type="button" 
                        onClick={insertHeading2}
                        title="Heading 2"
                      >
                        <span className="font-bold text-sm">H2</span>
                      </button>
                      <button 
                        className="p-2 rounded hover:bg-white transition-all" 
                        type="button" 
                        onClick={insertHeading3}
                        title="Heading 3"
                      >
                        <span className="font-bold text-sm">H3</span>
                      </button>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="flex items-center gap-1">
                      <button 
                        className="p-2 rounded hover:bg-white transition-all" 
                        type="button" 
                        onClick={insertQuote}
                        title="Quote"
                      >
                        <span className="text-sm">"</span>
                      </button>
                      <button 
                        className="p-2 rounded hover:bg-white transition-all" 
                        type="button" 
                        onClick={insertCodeBlock}
                        title="Code Block"
                      >
                        <span className="font-mono text-sm">{`{}`}</span>
                      </button>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="flex items-center gap-1">
                      <button 
                        className="p-2 rounded hover:bg-white transition-all" 
                        type="button" 
                        onClick={insertBold}
                        title="Bold"
                      >
                        <span className="font-bold text-sm">B</span>
                      </button>
                      <button 
                        className="p-2 rounded hover:bg-white transition-all" 
                        type="button" 
                        onClick={insertItalic}
                        title="Italic"
                      >
                        <span className="italic text-sm">I</span>
                      </button>
                      <button 
                        className="p-2 rounded hover:bg-white transition-all" 
                        type="button" 
                        onClick={insertUnderline}
                        title="Underline"
                      >
                        <span className="underline text-sm">U</span>
                      </button>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="flex items-center gap-1">
                      <button 
                        className="p-2 rounded hover:bg-white transition-all" 
                        type="button" 
                        onClick={insertBulletPoint}
                        title="Bullet List"
                      >
                        <span className="text-sm">•</span>
                      </button>
                      <button 
                        className="p-2 rounded hover:bg-white transition-all" 
                        type="button" 
                        onClick={insertNumberedList}
                        title="Numbered List"
                      >
                        <span className="text-sm">1.</span>
                      </button>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="text-xs text-gray-500">
                      Press Tab for indentation
                    </div>
                  </div>
                  
                  {/* Enhanced Content Area */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    <div className="h-full flex flex-col">
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Note title..."
                        className="w-full bg-transparent text-2xl font-bold mb-6 outline-none border-b border-gray-200 focus:border-yellow-400 transition-all pb-2 flex-shrink-0"
                        style={{ fontFamily: 'inherit' }}
                      />
                      <div
                        ref={contentEditableRef}
                        contentEditable
                        onInput={handleContentChange}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent text-base font-normal outline-none flex-1 resize-none border-none focus:ring-0 leading-relaxed min-h-[200px] whitespace-pre-wrap focus:bg-gray-50/50 transition-colors"
                        style={{ fontFamily: 'inherit' }}
                        suppressContentEditableWarning={true}
                        data-placeholder="Start writing your note..."
                      />
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="p-6 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={important}
                          onChange={() => setImportant(v => !v)}
                          className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Mark as important</span>
                      </label>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={activeNote ? handleUpdateNote : handleAddNote}
                          className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 transition-all"
                        >
                          {activeNote ? 'Save Changes' : 'Create Note'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {/* Note Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`text-2xl ${important ? 'text-yellow-500' : 'text-gray-300'}`}>★</span>
                      <h2 className="text-2xl font-bold text-gray-900 break-words">{title || 'Untitled Note'}</h2>
                    </div>
                    <div className="text-xs text-gray-500 flex flex-col gap-1">
                      {activeNote?.createdAt && <span>Created: {formatDateTime(activeNote.createdAt)}</span>}
                      {activeNote?.updatedAt && activeNote.updatedAt !== activeNote.createdAt && (
                        <span>Last updated: {formatDateTime(activeNote.updatedAt)}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Note Content */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    <div className="prose prose-gray max-w-none">
                      {content ? (
                        <div className="font-normal leading-relaxed">
                          <ReactMarkdown 
                            components={{
                              p: ({children}) => <div className="whitespace-pre-wrap mb-2">{children}</div>,
                              h1: ({children}) => <h1 className="text-4xl font-bold mb-4 mt-6">{children}</h1>,
                              h2: ({children}) => <h2 className="text-2xl font-bold mb-3 mt-5">{children}</h2>,
                              h3: ({children}) => <h3 className="text-xl font-bold mb-2 mt-4">{children}</h3>,
                              ul: ({children}) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                              li: ({children}) => <li className="whitespace-pre-wrap">{children}</li>,
                              blockquote: ({children}) => (
                                <blockquote className="border-l-4 border-gray-300 pl-4 py-2 my-4 bg-gray-50 italic">
                                  {children}
                                </blockquote>
                              ),
                              code: ({children, className}) => {
                                if (className) {
                                  // Code block
                                  return (
                                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                                      <code className="text-sm font-mono">{children}</code>
                                    </pre>
                                  );
                                }
                                // Inline code
                                return <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>;
                              },
                            }}
                          >
                            {content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-gray-500 italic">No content</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="p-6 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        {content.length} characters
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={handleEdit}
                          className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 transition-all"
                        >
                          Edit Note
                        </button>
                        <button
                          onClick={() => activeNote && handleDeleteNote(activeNote.id)}
                          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all"
                        >
                          Delete
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes; 