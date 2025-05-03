import React, { useState } from 'react';
import { Button } from "@/components/ui/button";

interface CreateClassFormProps {
  onSubmit: (formData: { name: string; symbol: string }) => Promise<void>;
  isCreating: boolean;
}

const CreateClassForm: React.FC<CreateClassFormProps> = ({ onSubmit, isCreating }) => {
  const [formData, setFormData] = useState({
    name: '',
    symbol: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const isLoading = isCreating || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-indigo-300">
          Class Name:
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter class name"
          required
          disabled={isLoading}
          className="mt-1 block w-full bg-gray-800 border border-gray-700 p-2 rounded-md text-gray-200 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-800/50 disabled:text-gray-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-indigo-300">
          Class Symbol:
        </label>
        <input
          type="text"
          name="symbol"
          value={formData.symbol}
          onChange={handleInputChange}
          placeholder="Enter class symbol"
          required
          disabled={isLoading}
          className="mt-1 block w-full bg-gray-800 border border-gray-700 p-2 rounded-md text-gray-200 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-800/50 disabled:text-gray-500"
        />
      </div>
      <Button
        type="submit"
        disabled={isLoading || !formData.name || !formData.symbol}
        className={`w-full transition-colors duration-200 flex items-center justify-center space-x-2 ${
          isLoading || !formData.name || !formData.symbol
            ? 'bg-gray-700 text-gray-400'
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
        }`}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Creating Class...</span>
          </>
        ) : (
          'Create Class'
        )}
      </Button>
    </form>
  );
};

export default CreateClassForm;