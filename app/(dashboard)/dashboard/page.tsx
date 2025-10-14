export default function DashboardHome() {
  return (
    <div className="space-y-4 lg:col-start-2 lg:row-start-1">
      <h2 className="text-2xl font-semibold">Welcome</h2>
      <p className="text-gray-700">
        Choose a condition from the left to start building a patient handout. Your clinic logo and footer will be
        included automatically on the exported PDF.
      </p>
      <ul className="list-disc pl-6 text-gray-700">
        <li>Select a condition to open the Handout Builder.</li>
        <li>Use Branding to upload your clinic logo and set your footer.</li>
        <li>Export a clean, evidence-based PDF for your patient.</li>
      </ul>
    </div>
  )
}
