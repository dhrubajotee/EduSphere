import { BarChart3 } from "lucide-react";

export default function PreferenceInput({ value, onChange }) {
  return (
    <div className="mt-6">
      <label
        htmlFor="preference"
        className="text-lg font-semibold text-gray-700 "
      >
        Enter Your Preference
      </label>

      <textarea
        id="preference"
        type="text"
        value={value}
        onChange={onChange}
        placeholder="Your preference..."
        className="
        w-full px-5 py-4 mt-2 mb-3 text-lg rounded-xl
        border border-gray-300 bg-gray-50
        focus:outline-none focus:ring-4 focus:ring-blue-200
        shadow-sm
        transition-all duration-200
        "
      />
    </div>
  );
}
