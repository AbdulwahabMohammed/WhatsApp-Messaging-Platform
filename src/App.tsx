/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Sessions from './pages/Sessions';
import Targets from './pages/Targets';
import Compose from './pages/Compose';
import Logs from './pages/Logs';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Sessions />} />
        <Route path="targets" element={<Targets />} />
        <Route path="compose" element={<Compose />} />
        <Route path="logs" element={<Logs />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
