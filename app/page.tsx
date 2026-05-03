export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-24">
      <div className="flex max-w-2xl flex-col items-center text-center">
        <span className="mb-6 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          Coming soon
        </span>

        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
          RideWise
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl">
          Plan your next ski or snowboard trip — map, weather, and pass info,
          all in one place.
        </p>

        <p className="mt-8 text-sm text-slate-400">
          Northeast US · Launching this season
        </p>
      </div>
    </main>
  );
}
