import BrandedLayout from '../../components/BrandedLayout';
import JobsScreen from '../JobsScreen';

export default function JobsWrapped(props) {
  return (
    <BrandedLayout>
      <JobsScreen {...props} />
    </BrandedLayout>
  );
}
