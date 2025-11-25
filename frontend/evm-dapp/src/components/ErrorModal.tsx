import React from "react";

interface ErrorModalProps {
  errorMessage: string | null;
  onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ errorMessage, onClose }) => {
  if (!errorMessage) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000] animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-[500px] w-[90%] max-h-[80vh] overflow-hidden animate-in slide-in-from-top-4 duration-300 sm:w-[95%] sm:m-5">
        <div className="p-0">
          <div className="flex justify-between items-center px-6 pt-5 pb-4 border-b border-gray-200 bg-red-50">
            <h3 className="m-0 text-lg font-semibold text-red-600">Error</h3>
            <button
              onClick={onClose}
              className="bg-transparent border-none text-2xl text-gray-500 cursor-pointer p-1 rounded transition-all duration-200 flex items-center justify-center w-8 h-8 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
          <div className="px-6 py-5 bg-white sm:px-5">
            <p className="m-0 text-base leading-relaxed text-gray-700 break-words">
              {errorMessage}
            </p>
          </div>
          <div className="px-6 pb-5 pt-4 border-t border-gray-200 bg-gray-50 flex justify-end sm:px-5">
            <button
              onClick={onClose}
              className="bg-red-600 text-white border-none px-5 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-red-700 active:bg-red-800"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
