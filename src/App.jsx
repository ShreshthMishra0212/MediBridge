import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import UploadPreviousPrescriptions from "./pages/UploadPreviousPrescriptions";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/previous-prescriptions"
          element={<UploadPreviousPrescriptions />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;