import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useIsMobile } from "../hooks/use-mobile";

interface PopupProps {
  title: string;
  onClose: () => void;
  content: React.ReactNode;
}

const Popup: React.FC<PopupProps> = ({ title, onClose, content }) => {
  const isMobile = useIsMobile();

  // Prevent body scrolling when popup is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-0 sm:p-4">
      <div
        className={`bg-gray-900/90 border border-gray-700 rounded-lg shadow-xl 
          ${
            isMobile
              ? "w-full h-full rounded-none"
              : "max-w-md w-full m-4 max-h-[90vh]"
          } 
          overflow-auto`}
      >
        <div className="sticky top-0 z-10 flex justify-between items-center p-4 bg-gray-900/95 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-indigo-300">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-indigo-300 transition-colors p-2 rounded-full hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 text-gray-300">{content}</div>
      </div>
    </div>
  );
};

export default Popup;
