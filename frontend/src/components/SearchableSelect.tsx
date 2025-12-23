import { useState, useRef, useEffect, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  error?: string;
  clearable?: boolean;
  className?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  loading = false,
  label,
  error,
  clearable = true,
  className = '',
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) => {
          const searchText = `${option.label} ${option.description || ''}`.toLowerCase();
          return searchText.includes(query.toLowerCase());
        });

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  return (
    <div className={className}>
      {label && (
        <label className="label">{label}</label>
      )}
      <Combobox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
            <Combobox.Input
              ref={inputRef}
              className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 focus:outline-none disabled:bg-gray-100"
              displayValue={(val: string) => {
                const opt = options.find(o => o.value === val);
                return opt ? opt.label : '';
              }}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-1"></div>
              )}
              {clearable && value && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-400" />
                </button>
              )}
              <Combobox.Button className="p-1">
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </Combobox.Button>
            </div>
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredOptions.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  No se encontraron resultados.
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <Combobox.Option
                    key={option.value}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? 'bg-primary-600 text-white' : 'text-gray-900'
                      }`
                    }
                    value={option.value}
                  >
                    {({ selected, active }) => (
                      <>
                        <div className="flex flex-col">
                          <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                            {option.label}
                          </span>
                          {option.description && (
                            <span className={`block truncate text-xs ${active ? 'text-primary-200' : 'text-gray-500'}`}>
                              {option.description}
                            </span>
                          )}
                        </div>
                        {selected && (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              active ? 'text-white' : 'text-primary-600'
                            }`}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
