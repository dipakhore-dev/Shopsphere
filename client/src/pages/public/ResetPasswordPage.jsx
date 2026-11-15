import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthCard, { authLinkClass } from '../../components/auth/AuthCard.jsx';
import FormField from '../../components/common/FormField.jsx';
import Button from '../../components/common/Button.jsx';
import { resetPassword } from '../../services/auth.service.js';
import { getErrorMessage } from '../../utils/errors.js';
import { passwordRules } from '../../utils/validation.js';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { password: '', confirmPassword: '' } });

  const onSubmit = async ({ password }) => {
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (!token) {
    return (
      <AuthCard title="Reset link is incomplete">
        <p role="alert" className="text-sm text-danger-600">
          This page needs the link from your email. Request a new one below.
        </p>
        <Button as={Link} to="/forgot-password" className="mt-4 w-full">
          Request a new link
        </Button>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title="Password updated">
        <p role="status" className="text-sm text-ink-700">
          Your password was changed and you were signed out everywhere. Log in with your new password.
        </p>
        <Button as={Link} to="/login" className="mt-4 w-full">
          Go to log in
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      footer={
        <Link to="/login" className={authLinkClass}>
          Back to log in
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.password?.message}
          {...register('password', passwordRules)}
        />
        <FormField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Confirm your password',
            validate: (v) => v === watch('password') || 'Passwords do not match',
          })}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          Update password
        </Button>
      </form>
    </AuthCard>
  );
}
