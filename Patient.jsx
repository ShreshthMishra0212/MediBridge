import React from "react";

function Patient() {
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">

          <Logo />

          <Link
            to="/"
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
          >
            ← Home
          </Link>

        </div>
      </header>


      {/* Patient Dashboard */}

      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">

        {/* Welcome */}

        <div className="mb-8">

          <span className="rounded-full bg-teal-50 px-3 py-2 text-xs font-bold text-teal-600">
            PATIENT PORTAL
          </span>

          <h1 className="mt-5 text-4xl font-black">
            Welcome to MediBridge
          </h1>

          <p className="mt-3 max-w-2xl text-slate-500">
            Manage your medicines, appointments and prescriptions
            from one place.
          </p>

        </div>


        {/* Main Patient Options */}

        <div className="grid gap-6 md:grid-cols-3">


          {/* SCAN MEDICINE */}

          <Link
            to="/medicine-analysis"
            className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-2 hover:border-teal-300 hover:shadow-xl"
          >

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl">
              💊
            </div>

            <h2 className="mt-6 text-xl font-black">
              Scan Medicine
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Upload a medicine image and get its name, salt,
              strength and other information.
            </p>

            <div className="mt-6 text-sm font-bold text-teal-500">
              Scan Medicine →
            </div>

          </Link>


          {/* BOOK APPOINTMENT */}

          <Link
            to="/appointment"
            className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-2 hover:border-blue-300 hover:shadow-xl"
          >

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              📅
            </div>

            <h2 className="mt-6 text-xl font-black">
              Book an Appointment
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Find a doctor and book an appointment
              according to your preferred time.
            </p>

            <div className="mt-6 text-sm font-bold text-blue-500">
              Book Appointment →
            </div>

          </Link>


          {/* PREVIOUS PRESCRIPTIONS */}

          <Link
            to="/prescriptions"
            className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-2 hover:border-violet-300 hover:shadow-xl"
          >

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-2xl">
              📄
            </div>

            <h2 className="mt-6 text-xl font-black">
              Previous Prescriptions
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Upload and access your previous prescriptions
              whenever you need them.
            </p>

            <div className="mt-6 text-sm font-bold text-violet-500">
              View Prescriptions →
            </div>

          </Link>

        </div>


        {/* Recent Activity */}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Patient Activity
              </p>

              <h2 className="mt-1 text-xl font-black">
                Recent Activity
              </h2>

            </div>

          </div>


          <div className="mt-6 grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl bg-slate-50 p-5">

              <span className="text-xl">
                💊
              </span>

              <p className="mt-3 text-sm font-bold">
                Medicine Scan
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Scan your medicine to view information.
              </p>

            </div>


            <div className="rounded-2xl bg-slate-50 p-5">

              <span className="text-xl">
                📅
              </span>

              <p className="mt-3 text-sm font-bold">
                Appointments
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Manage your upcoming appointments.
              </p>

            </div>


            <div className="rounded-2xl bg-slate-50 p-5">

              <span className="text-xl">
                📄
              </span>

              <p className="mt-3 text-sm font-bold">
                Prescriptions
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Access your uploaded prescriptions.
              </p>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}