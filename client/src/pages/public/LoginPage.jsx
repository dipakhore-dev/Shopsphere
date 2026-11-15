import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import AuthCard, { authLinkClass } from '../../components/auth/AuthCard.jsx';
import FormField from '../../components/common/FormField.jsx';
import Button from '../../components/common/Button.jsx';
import { loginUser } from '../../redux/slices/authSlice.js';
import { EMAIL_PATTERN } from '../../utils/validation.js';

export default function LoginPage() {
  const dispatch = useDispatch();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: '', password: '' } });

  // On success the store gets the user and <GuestRoute> redirects automatically.
  const onSubmit = async (values) => {
    try {
      const user = await dispatch(loginUser(values)).unwrap();
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
    } catch (message) {
      toast.error(typeof message === 'string' ? message : 'Could not log in. Please try again.');
    }
  };

  return (
    <AuthCard
      title="Log in"
      subtitle="Welcome back. Enter your details to continue."
      footer={
        <>
          New to ShopSphere?{' '}
          <Link to="/register" className={authLinkClass}>
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', {
            required: 'Enter your email',
            pattern: { value: EMAIL_PATTERN, message: 'Enter a valid email address' },
          })}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: 'Enter your password' })}
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className={`text-sm ${authLinkClass}`}>
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={isSubmitting} className="w-full">
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
