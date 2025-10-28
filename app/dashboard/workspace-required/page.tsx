export default function WorkspaceRequiredPage() {
  return (
    <div className="min-h-[320px] rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Workspace setup required</h1>
      <p className="mt-3 text-sm text-gray-700">
        We could not find a clinic or workspace linked to your account. Complete onboarding to create one or contact
        support so we can get you access.
      </p>
    </div>
  )
}
