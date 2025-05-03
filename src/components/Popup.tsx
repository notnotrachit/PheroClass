import React from 'react';

interface PopupProps {
    title: string;
    onClose: () => void;
    content: React.ReactNode;
}

const Popup: React.FC<PopupProps> = ({ title, onClose, content }) => {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-gray-900/90 border border-gray-700 rounded-lg shadow-xl p-6 max-w-md w-full m-4 max-h-[90vh] overflow-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-indigo-300">{title}</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-indigo-300 transition-colors"
                    >
                        ✕
                    </button>
                </div>
                <div className="mb-4 text-gray-300">{content}</div>
            </div>
        </div>
    );
};

export default Popup;