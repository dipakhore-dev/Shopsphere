import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import AuthCard, { authLinkClass } from '../../components/auth/AuthCard.jsx';
import FormField from '../../components/common/FormField.jsx';
import Button from '../../components/common/Button.jsx';
import { registerUser } from '../../redux/slices/authSlice.js';
import { EMAIL_PATTERN, passwordRules } from '../../utils/validation.js';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { name: '', email: '', password: '', confirmPassword: '' } });

  const onSubmit = async ({ name, email, password }) => {
    try {
      await dispatch(registerUser({ name, email, password })).unwrap();
      toast.success('Account created. Check your email to verify your address.');
    } catch (message) {
      toast.error(typeof message === 'string' ? message : 'Could not create your account.');
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Shop from independent sellers across the marketplace."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className={authLinkClass}>
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField
          label="Full name"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name', {
            required: 'Enter your name',
            minLength: { value: 2, message: 'Name is too short' },
            maxLength: { value: 60, message: 'Name is too long' },
            validate: (v) => !/[<>]/.test(v) || 'Name cannot contain < or >',
          })}
        />
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
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.password?.message}
          {...register('password', passwordRules)}
        />
        <FormField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Confirm your password',
            validate: (v) => v === watch('password') || 'Passwords do not match',
          })}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
