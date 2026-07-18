import React from 'react';
import {Composition} from 'remotion';
import {FacelessListicle, facelessMetadata} from './FacelessListicle';
import {SacredFilm, sacredMetadata} from './SacredFilm';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FacelessListicle"
        component={FacelessListicle}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={facelessMetadata}
        defaultProps={{
          title: 'Sample',
          accent: '#c45670',
          scenes: [{kind: 'title', label: 'Sample', frames: 60}],
        }}
      />
      <Composition
        id="SacredFilm"
        component={SacredFilm}
        fps={30}
        width={1920}
        height={1080}
        calculateMetadata={sacredMetadata}
        defaultProps={{
          title: 'The Story of Ruth',
          accent: '#c45670',
          scenes: [{kind: 'title', label: 'The Story of Ruth', frames: 90}],
        }}
      />
    </>
  );
};
