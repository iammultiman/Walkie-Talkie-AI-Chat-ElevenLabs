import React, { useState } from 'react';
import { ChatSession } from '../types';
import { ExportIcon } from './Icons';

interface SidePanelProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onUpdateSessionTitle: (id: string, newTitle: string) => void;
  isOpen: boolean;       // For mobile overlay state
  isCollapsed: boolean; // For desktop collapsed state
  onClose: () => void;
}

const TrashIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.006a.75.75 0 0 1-.749.657H3.126a.75.75 0 0 1-.749-.657L1.372 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.9h1.368c1.603 0 2.816 1.336 2.816 2.9Zm-1.487.227a.75.75 0 0 1-.75-.75c0-.884-.716-1.6-1.58-1.6h-1.368c-.863 0-1.58.716-1.58 1.6a.75.75 0 0 1-.75.75H4.522c-.574 0-1.04.46-1.069.944l-1.004 13.006a2.25 2.25 0 0 0 2.245 2.55h13.818a2.25 2.25 0 0 0 2.244-2.55l-1.005-13.006c-.028-.483-.495-.944-1.069-.944H15.013Z" clipRule="evenodd" />
    </svg>
);

const EditIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
    </svg>
);


const SidePanel: React.FC<SidePanelProps> = ({ sessions, activeSessionId, onSelectSession, onDeleteSession, onUpdateSessionTitle, isOpen, isCollapsed, onClose }) => {
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState<string>('');
    const [justCopiedId, setJustCopiedId] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);
    
    const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this chat?")) {
            onDeleteSession(sessionId);
        }
    };

    const handleEditClick = (e: React.MouseEvent, session: ChatSession) => {
        e.stopPropagation();
        setEditingSessionId(session.id);
        setEditingTitle(session.title);
    };

    const handleExportClick = (e: React.MouseEvent, session: ChatSession) => {
        e.stopPropagation();
        
        let exportText = `Chat: ${session.title}\nDate: ${new Date(session.timestamp).toLocaleString()}\n\n`;
        
        session.history.forEach((msg, index) => {
            const role = msg.role === 'user' ? 'User' : 'AI';
            exportText += `[${role}]: ${msg.parts[0].text}\n\n`;
        });
        
        navigator.clipboard.writeText(exportText).then(() => {
            setJustCopiedId(session.id);
            setNotification("Chat thread copied to clipboard");
            setTimeout(() => {
                setJustCopiedId(null);
                setNotification(null);
            }, 2000);
        });
    };

    const handleSaveTitle = (sessionId: string) => {
        if (editingTitle.trim()) {
            onUpdateSessionTitle(sessionId, editingTitle.trim());
        }
        setEditingSessionId(null);
        setEditingTitle('');
    };

    const handleCancelEdit = () => {
        setEditingSessionId(null);
        setEditingTitle('');
    };

    const handleKeyDown = (e: React.KeyboardEvent, sessionId: string) => {
        if (e.key === 'Enter') {
            handleSaveTitle(sessionId);
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    const panelClasses = `
      fixed top-0 left-0 h-full z-40 
      bg-gray-50 dark:bg-gray-800 
      border-r border-gray-200 dark:border-gray-700 
      flex flex-col transition-all duration-300 shadow-lg
      ${isCollapsed ? 'w-0 md:w-0' : 'w-80 md:w-80'}
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      md:relative md:z-auto 
      md:translate-x-0
    `;

    return (
        <>
            <div 
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>
            <aside className={panelClasses}>
                <div className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300 ${isCollapsed && 'hidden'}`}>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Chat History</h2>
                    <button onClick={onClose} className="p-1 md:hidden text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className={`flex-1 overflow-y-auto overflow-x-hidden p-2 ${isCollapsed && 'invisible'}`}>
                    <ul className="space-y-1">
                        {sessions.map((session) => (
                            <li key={session.id}>
                                <button 
                                    onClick={() => onSelectSession(session.id)}
                                    className={`w-full text-left p-3 rounded-lg group flex justify-between items-center transition-all duration-200 ${activeSessionId === session.id ? 'bg-indigo-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                                >
                                    <div className="flex-grow overflow-hidden">
                                        {editingSessionId === session.id ? (
                                            <input
                                                type="text"
                                                value={editingTitle}
                                                onChange={(e) => setEditingTitle(e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, session.id)}
                                                onBlur={() => handleSaveTitle(session.id)}
                                                className="w-full bg-white dark:bg-gray-600 px-2 py-1 rounded text-sm font-medium border border-indigo-300 dark:border-indigo-500"
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <p className={`truncate font-medium ${activeSessionId === session.id ? 'text-indigo-800 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'}`}>{session.title}</p>
                                        )}
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {new Date(session.timestamp).toLocaleString(undefined, {dateStyle: 'short', timeStyle: 'short'})}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                        <button 
                                            onClick={(e) => handleExportClick(e, session)}
                                            className={`p-1 rounded transition-colors ${justCopiedId === session.id ? 'text-green-500' : 'text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                                            title="Export chat thread"
                                        >
                                           <ExportIcon className="w-4 h-4"/>
                                        </button>
                                        <button 
                                            onClick={(e) => handleEditClick(e, session)}
                                            className="text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 p-1 rounded transition-colors"
                                            title="Edit title"
                                        >
                                            <EditIcon className="w-4 h-4"/>
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteClick(e, session.id)}
                                            className="text-gray-500 hover:text-red-500 p-1 rounded transition-colors"
                                            title="Delete chat"
                                        >
                                            <TrashIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Notification Area */}
                {notification && !isCollapsed && (
                    <div className="p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm font-medium text-center border-t border-green-200 dark:border-green-800 animate-pulse">
                        {notification}
                    </div>
                )}
            </aside>
        </>
    );
};

export default SidePanel;