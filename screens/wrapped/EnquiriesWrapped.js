import BrandedLayout from '../../components/BrandedLayout';
import EnquiriesScreen from '../EnquiriesScreen';

export default function EnquiriesWrapped(props) {
  return (
    <BrandedLayout>
      <EnquiriesScreen {...props} />
    </BrandedLayout>
  );
}
