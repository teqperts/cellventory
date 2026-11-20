import BrandedLayout from '../../components/BrandedLayout';
import CustomersScreen from '../CustomersScreen';

export default function CustomersWrapped(props) {
  return (
    <BrandedLayout>
      <CustomersScreen {...props} />
    </BrandedLayout>
  );
}
