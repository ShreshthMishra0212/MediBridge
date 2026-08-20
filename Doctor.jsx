import React from "react";

function Doctor() {
  return (
    <div className="min-h-screen bg-slate-50">

      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-5">

          <h1 className="text-xl font-black">
            Medi
            <span className="text-teal-500">Bridge</span>
          </h1>

        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-12">

        <h1 className="text-4xl font-black">
          Doctor Portal
        </h1>

        <p className="mt-3 text-slate-500">
          Access patient medicine information and healthcare data.
        </p>

      </main>

    </div>
  );
}

export default Doctor;