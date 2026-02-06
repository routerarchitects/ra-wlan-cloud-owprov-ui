import React from 'react';
import RadiusForm from './Radius';

type Props = { editing: boolean; namePrefix: string; isPasspoint?: boolean };

const OpenRoamingRadius = ({ editing, namePrefix, isPasspoint }: Props) => (
  <RadiusForm editing={editing} namePrefix={namePrefix} isPasspoint={isPasspoint} />
);

export default React.memo(OpenRoamingRadius);
