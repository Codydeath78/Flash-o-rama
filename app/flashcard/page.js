import React, { Suspense } from 'react';
import Flashcard from './Flashcard'; // move your current component into Flashcard.js
import { CircularProgress } from '@mui/material';

export default function FlashcardPageWrapper() {
  return (
    <Suspense fallback={<CircularProgress sx={{ marginTop: '4rem' }} />}>
      <Flashcard />
    </Suspense>
  );
}