import React, { Suspense } from 'react';
import Result from './Result'; // move the component code to ResultPage.js
import { CircularProgress } from '@mui/material';

export default function ResultPageWrapper() {
  return (
    <Suspense fallback={<CircularProgress sx={{ marginTop: '4rem' }} />}>
      <Result />
    </Suspense>
  );
}