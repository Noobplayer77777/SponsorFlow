export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <main className="flex flex-col items-center gap-6 text-center max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          SponsorFlow
        </h1>
        <p className="text-lg leading-8 text-gray-600">
          Sponsorship Outreach & Management Platform
        </p>
        <div className="mt-6 flex items-center justify-center gap-x-6">
          <a href="/login" className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            Login with Google
          </a>
        </div>
      </main>
    </div>
  );
}
